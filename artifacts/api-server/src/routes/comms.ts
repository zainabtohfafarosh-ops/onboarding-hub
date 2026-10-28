import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, commTemplatesTable, scheduledCommsTable, hiresTable } from "@workspace/db";
import {
  ListCommTemplatesResponse,
  CreateCommTemplateBody,
  CreateCommTemplateResponse,
  GetCommTemplateParams,
  GetCommTemplateResponse,
  UpdateCommTemplateParams,
  UpdateCommTemplateBody,
  UpdateCommTemplateResponse,
  DeleteCommTemplateParams,
  ListScheduledCommsQueryParams,
  ListScheduledCommsResponse,
  CreateScheduledCommBody,
  CreateScheduledCommResponse,
  GetScheduledCommParams,
  GetScheduledCommResponse,
  UpdateScheduledCommParams,
  UpdateScheduledCommBody,
  UpdateScheduledCommResponse,
  DeleteScheduledCommParams,
  MarkScheduledCommSentParams,
  MarkScheduledCommSentResponse,
} from "@workspace/api-zod";
import { upsertCommunicationTask } from "../lib/communication-tasks";

const router = Router();

// --- Comm Templates ---

// GET /comm-templates
router.get("/comm-templates", async (req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(commTemplatesTable)
    .orderBy(
      sql`CASE ${commTemplatesTable.name}
        WHEN 'New Hire Welcome Email' THEN 1
        WHEN 'Hiring Managers Upcoming Hire Notification' THEN 2
        WHEN 'Laptop Shipping Details (Virtual Hires Only)' THEN 3
        WHEN 'IT Set Up Instructions (Virtual Hires Only)' THEN 4
        ELSE 5
      END`,
      desc(commTemplatesTable.updatedAt),
      desc(commTemplatesTable.id),
    );
  res.json(ListCommTemplatesResponse.parse(templates.map(toCommTemplateResponse)));
});

// POST /comm-templates
router.post("/comm-templates", async (req, res): Promise<void> => {
  const parsed = CreateCommTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [template] = await db.insert(commTemplatesTable).values(parsed.data).returning();
  res.status(201).json(CreateCommTemplateResponse.parse(toCommTemplateResponse(template)));
});

// GET /comm-templates/:id
router.get("/comm-templates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = GetCommTemplateParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [template] = await db.select().from(commTemplatesTable).where(eq(commTemplatesTable.id, id));
  if (!template) {
    res.status(404).json({ error: "Comm template not found" });
    return;
  }
  res.json(GetCommTemplateResponse.parse(toCommTemplateResponse(template)));
});

// PATCH /comm-templates/:id
router.patch("/comm-templates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const paramParsed = UpdateCommTemplateParams.safeParse({ id });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateCommTemplateBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const [template] = await db
    .update(commTemplatesTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(eq(commTemplatesTable.id, id))
    .returning();
  if (!template) {
    res.status(404).json({ error: "Comm template not found" });
    return;
  }
  res.json(UpdateCommTemplateResponse.parse(toCommTemplateResponse(template)));
});

// DELETE /comm-templates/:id
router.delete("/comm-templates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = DeleteCommTemplateParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(commTemplatesTable).where(eq(commTemplatesTable.id, id));
  res.status(204).send();
});

// --- Scheduled Comms ---

// GET /scheduled-comms
router.get("/scheduled-comms", async (req, res): Promise<void> => {
  const parsed = ListScheduledCommsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { hireId, status } = parsed.data;
  const conditions = [];
  if (hireId) conditions.push(eq(scheduledCommsTable.hireId, hireId));
  if (status) conditions.push(eq(scheduledCommsTable.status, status));

  const statusOrder = sql`CASE
    WHEN ${scheduledCommsTable.status} IN ('scheduled', 'edited') THEN 1
    WHEN ${scheduledCommsTable.status} = 'sent' THEN 2
    WHEN ${scheduledCommsTable.status} = 'cancelled' THEN 3
    ELSE 4
  END`;
  const rows = conditions.length > 0
    ? await db
        .select()
        .from(scheduledCommsTable)
        .where(and(...conditions))
        .orderBy(statusOrder, asc(scheduledCommsTable.scheduledAt), asc(scheduledCommsTable.id))
    : await db
        .select()
        .from(scheduledCommsTable)
        .orderBy(statusOrder, asc(scheduledCommsTable.scheduledAt), asc(scheduledCommsTable.id));

  // Enrich with hire names
  const hireIds = [...new Set(rows.map(r => r.hireId))];
  const hires = hireIds.length > 0
    ? await db.select({ id: hiresTable.id, firstName: hiresTable.firstName, lastName: hiresTable.lastName })
        .from(hiresTable)
        .where(hireIds.length === 1 ? eq(hiresTable.id, hireIds[0]) : eq(hiresTable.id, hireIds[0]))
    : [];

  // Fetch all hires separately
  let allHires: Array<{id: number; firstName: string; lastName: string}> = [];
  if (hireIds.length > 0) {
    allHires = await Promise.all(
      hireIds.map(id => db.select({ id: hiresTable.id, firstName: hiresTable.firstName, lastName: hiresTable.lastName }).from(hiresTable).where(eq(hiresTable.id, id)).then(r => r[0]).then(r => r || null))
    ).then(results => results.filter(Boolean) as Array<{id: number; firstName: string; lastName: string}>);
  }

  const hireMap = new Map(allHires.map(h => [h.id, `${h.firstName} ${h.lastName}`]));

  res.json(ListScheduledCommsResponse.parse(rows.map(r => toScheduledCommResponse(r, hireMap.get(r.hireId) || null))));
});

// POST /scheduled-comms
router.post("/scheduled-comms", async (req, res): Promise<void> => {
  const parsed = CreateScheduledCommBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const comm = await db.transaction(async (tx) => {
    const [created] = await tx.insert(scheduledCommsTable).values(parsed.data).returning();
    await upsertCommunicationTask(tx, created);
    return created;
  });
  const [hire] = await db.select({ firstName: hiresTable.firstName, lastName: hiresTable.lastName })
    .from(hiresTable).where(eq(hiresTable.id, comm.hireId));
  const hireName = hire ? `${hire.firstName} ${hire.lastName}` : null;
  res.status(201).json(CreateScheduledCommResponse.parse(toScheduledCommResponse(comm, hireName)));
});

// GET /scheduled-comms/:id
router.get("/scheduled-comms/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = GetScheduledCommParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [comm] = await db.select().from(scheduledCommsTable).where(eq(scheduledCommsTable.id, id));
  if (!comm) {
    res.status(404).json({ error: "Scheduled comm not found" });
    return;
  }
  const [hire] = await db.select({ firstName: hiresTable.firstName, lastName: hiresTable.lastName })
    .from(hiresTable).where(eq(hiresTable.id, comm.hireId));
  const hireName = hire ? `${hire.firstName} ${hire.lastName}` : null;
  res.json(GetScheduledCommResponse.parse(toScheduledCommResponse(comm, hireName)));
});

// PATCH /scheduled-comms/:id
router.patch("/scheduled-comms/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const paramParsed = UpdateScheduledCommParams.safeParse({ id });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateScheduledCommBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...bodyParsed.data, updatedAt: new Date() };
  // Auto-set status to 'edited' if body or subject changed and no explicit status set
  if (("body" in bodyParsed.data || "subject" in bodyParsed.data || "scheduledAt" in bodyParsed.data) && !bodyParsed.data.status) {
    updateData.status = "edited";
  }
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(scheduledCommsTable)
      .where(eq(scheduledCommsTable.id, id))
      .for("update");
    if (!existing) return { comm: null, terminal: false };
    if (existing.status === "sent" || existing.status === "cancelled") {
      return { comm: existing, terminal: true };
    }

    const [updated] = await tx
      .update(scheduledCommsTable)
      .set(updateData)
      .where(eq(scheduledCommsTable.id, id))
      .returning();
    if (updated) await upsertCommunicationTask(tx, updated);
    return { comm: updated, terminal: false };
  });
  const comm = result.comm;
  if (!comm) {
    res.status(404).json({ error: "Scheduled comm not found" });
    return;
  }
  if (result.terminal) {
    res.status(409).json({ error: `${comm.status === "sent" ? "Sent" : "Cancelled"} communications cannot be edited` });
    return;
  }
  const [hire] = await db.select({ firstName: hiresTable.firstName, lastName: hiresTable.lastName })
    .from(hiresTable).where(eq(hiresTable.id, comm.hireId));
  const hireName = hire ? `${hire.firstName} ${hire.lastName}` : null;
  res.json(UpdateScheduledCommResponse.parse(toScheduledCommResponse(comm, hireName)));
});

// DELETE /scheduled-comms/:id
router.delete("/scheduled-comms/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = DeleteScheduledCommParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(scheduledCommsTable).where(eq(scheduledCommsTable.id, id));
  res.status(204).send();
});

// POST /scheduled-comms/:id/send
router.post("/scheduled-comms/:id/send", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = MarkScheduledCommSentParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(scheduledCommsTable)
      .set({ status: "sent", sentAt: new Date().toISOString(), updatedAt: new Date() })
      .where(and(
        eq(scheduledCommsTable.id, id),
        inArray(scheduledCommsTable.status, ["scheduled", "edited"]),
      ))
      .returning();

    if (updated) {
      await upsertCommunicationTask(tx, updated);
      return { comm: updated, cancelled: false };
    }

    const [existing] = await tx
      .select()
      .from(scheduledCommsTable)
      .where(eq(scheduledCommsTable.id, id))
      .for("update");
    if (!existing) return { comm: null, cancelled: false };
    if (existing.status === "cancelled") return { comm: existing, cancelled: true };

    await upsertCommunicationTask(tx, existing);
    return { comm: existing, cancelled: false };
  });
  const comm = result.comm;
  if (!comm) {
    res.status(404).json({ error: "Scheduled comm not found" });
    return;
  }
  if (result.cancelled) {
    res.status(409).json({ error: "Cancelled communications cannot be marked sent" });
    return;
  }
  const [hire] = await db.select({ firstName: hiresTable.firstName, lastName: hiresTable.lastName })
    .from(hiresTable).where(eq(hiresTable.id, comm.hireId));
  const hireName = hire ? `${hire.firstName} ${hire.lastName}` : null;
  res.json(MarkScheduledCommSentResponse.parse(toScheduledCommResponse(comm, hireName)));
});

function toCommTemplateResponse(t: typeof commTemplatesTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toScheduledCommResponse(
  comm: typeof scheduledCommsTable.$inferSelect,
  hireName: string | null
) {
  return {
    ...comm,
    hireName,
    commTemplateId: comm.commTemplateId ?? null,
    sentAt: comm.sentAt ?? null,
    createdAt: comm.createdAt.toISOString(),
    updatedAt: comm.updatedAt.toISOString(),
  };
}

export default router;
