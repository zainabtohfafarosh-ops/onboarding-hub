import { Router } from "express";
import { db, syncStatusTable, hiresTable } from "@workspace/db";
import { SyncGoogleSheetsBody, SyncGoogleSheetsResponse, GetSyncStatusResponse } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /sync/status
router.get("/sync/status", async (req, res): Promise<void> => {
  const [status] = await db.select().from(syncStatusTable).orderBy(desc(syncStatusTable.updatedAt)).limit(1);
  if (!status) {
    res.json(GetSyncStatusResponse.parse({
      lastSyncAt: null,
      hiresAdded: 0,
      hiresUpdated: 0,
      status: "never",
      errorMessage: null,
      spreadsheetId: null,
      sheetName: null,
    }));
    return;
  }
  res.json(GetSyncStatusResponse.parse({
    lastSyncAt: status.lastSyncAt ?? null,
    hiresAdded: status.hiresAdded,
    hiresUpdated: status.hiresUpdated,
    status: status.status,
    errorMessage: status.errorMessage ?? null,
    spreadsheetId: status.spreadsheetId ?? null,
    sheetName: status.sheetName ?? null,
  }));
});

// POST /sync/google-sheets
router.post("/sync/google-sheets", async (req, res): Promise<void> => {
  const parsed = SyncGoogleSheetsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { spreadsheetId, sheetName } = parsed.data;

  // Google Sheets connector integration (uses REPLIT_CONNECTORS_HOSTNAME injected by platform)
  // If connector is not set up, return a meaningful error
  const connectorsHost = process.env.REPLIT_CONNECTORS_HOSTNAME;

  if (!connectorsHost) {
    // Connector not configured — save error status and return
    await upsertSyncStatus({
      status: "error",
      errorMessage: "Google Sheets connector is not configured. Please connect your Google Sheets account.",
      spreadsheetId,
      sheetName: sheetName || null,
      hiresAdded: 0,
      hiresUpdated: 0,
    });
    res.status(200).json(SyncGoogleSheetsResponse.parse({
      status: "error",
      errorMessage: "Google Sheets connector is not configured.",
      lastSyncAt: null,
      hiresAdded: 0,
      hiresUpdated: 0,
      spreadsheetId,
      sheetName: sheetName || null,
    }));
    return;
  }

  try {
    // Attempt to fetch data from Google Sheets via connector proxy
    const tokenRes = await fetch(`https://${connectorsHost}/api/v2/connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "repl-identity": process.env.REPL_IDENTITY || "" },
      body: JSON.stringify({ connectorName: "google-sheet" }),
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to get Google Sheets connector token");
    }

    const { token } = await tokenRes.json() as { token: string };
    const targetSheet = sheetName || "Sheet1";

    // Fetch spreadsheet data
    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheet)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!sheetsRes.ok) {
      const errText = await sheetsRes.text();
      throw new Error(`Sheets API error: ${sheetsRes.status} ${errText}`);
    }

    const data = await sheetsRes.json() as { values?: string[][] };
    const rows = data.values || [];

    if (rows.length < 2) {
      await upsertSyncStatus({ status: "success", spreadsheetId, sheetName: targetSheet, hiresAdded: 0, hiresUpdated: 0, errorMessage: null });
      res.json(SyncGoogleSheetsResponse.parse({ status: "success", lastSyncAt: new Date().toISOString(), hiresAdded: 0, hiresUpdated: 0, spreadsheetId, sheetName: targetSheet, errorMessage: null }));
      return;
    }

    const headers = rows[0].map((h: string) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    const col = (name: string) => {
      const idx = headers.indexOf(name);
      return (row: string[]) => (idx >= 0 ? (row[idx] || "").trim() : "");
    };

    let hiresAdded = 0;
    let hiresUpdated = 0;

    for (const row of dataRows) {
      const email = col("email")(row);
      if (!email) continue;

      const hireData = {
        firstName: col("firstname")(row) || col("first name")(row) || col("first_name")(row) || "Unknown",
        lastName: col("lastname")(row) || col("last name")(row) || col("last_name")(row) || "Unknown",
        email,
        title: col("title")(row) || col("job title")(row) || "Unknown",
        department: col("department")(row) || null,
        location: col("location")(row) || col("office")(row) || "Unknown",
        orientationType: (col("orientationtype")(row) || col("orientation type")(row) || col("orientation_type")(row) || "in-person") as "in-person" | "virtual",
        orientationDate: col("orientationdate")(row) || col("orientation date")(row) || col("orientation_date")(row) || new Date().toISOString().split("T")[0],
        hiringManager: col("hiringmanager")(row) || col("hiring manager")(row) || col("hiring_manager")(row) || "Unknown",
        recruiter: col("recruiter")(row) || "Unknown",
        laptopTrackingNumber: col("laptoptrackingnumber")(row) || col("laptop tracking")(row) || null,
        shippingAddress: col("shippingaddress")(row) || col("shipping address")(row) || col("address")(row) || null,
        addressSharedWithIT: (col("addresssharedwithit")(row) || col("address shared with it")(row) || "").toLowerCase() === "true",
        status: (col("status")(row) as "confirmed" | "pending" | "cancelled") || "confirmed",
        notes: col("notes")(row) || null,
      };

      const existing = await db.select({ id: hiresTable.id }).from(hiresTable).where(eq(hiresTable.email, email));
      if (existing.length > 0) {
        await db.update(hiresTable).set({ ...hireData, updatedAt: new Date() }).where(eq(hiresTable.email, email));
        hiresUpdated++;
      } else {
        await db.insert(hiresTable).values(hireData);
        hiresAdded++;
      }
    }

    await upsertSyncStatus({ status: "success", spreadsheetId, sheetName: targetSheet, hiresAdded, hiresUpdated, errorMessage: null });
    res.json(SyncGoogleSheetsResponse.parse({
      status: "success",
      lastSyncAt: new Date().toISOString(),
      hiresAdded,
      hiresUpdated,
      spreadsheetId,
      sheetName: targetSheet,
      errorMessage: null,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await upsertSyncStatus({ status: "error", errorMessage: msg, spreadsheetId, sheetName: sheetName || null, hiresAdded: 0, hiresUpdated: 0 });
    res.status(200).json(SyncGoogleSheetsResponse.parse({
      status: "error",
      errorMessage: msg,
      lastSyncAt: null,
      hiresAdded: 0,
      hiresUpdated: 0,
      spreadsheetId,
      sheetName: sheetName || null,
    }));
  }
});

async function upsertSyncStatus(data: {
  status: string;
  spreadsheetId: string;
  sheetName: string | null;
  hiresAdded: number;
  hiresUpdated: number;
  errorMessage: string | null;
}) {
  const existing = await db.select().from(syncStatusTable).limit(1);
  const now = new Date();
  if (existing.length > 0) {
    await db.update(syncStatusTable).set({
      lastSyncAt: data.status === "success" ? now.toISOString() : existing[0].lastSyncAt,
      hiresAdded: data.hiresAdded,
      hiresUpdated: data.hiresUpdated,
      status: data.status,
      errorMessage: data.errorMessage,
      spreadsheetId: data.spreadsheetId,
      sheetName: data.sheetName,
      updatedAt: now,
    }).where(eq(syncStatusTable.id, existing[0].id));
  } else {
    await db.insert(syncStatusTable).values({
      lastSyncAt: data.status === "success" ? now.toISOString() : null,
      hiresAdded: data.hiresAdded,
      hiresUpdated: data.hiresUpdated,
      status: data.status,
      errorMessage: data.errorMessage,
      spreadsheetId: data.spreadsheetId,
      sheetName: data.sheetName,
    });
  }
}

export default router;
