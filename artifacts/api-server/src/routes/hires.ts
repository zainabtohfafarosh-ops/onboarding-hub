import { Router } from "express";
import { eq, ilike, and, or } from "drizzle-orm";
import { db, hiresTable, hireTasksTable, commTemplatesTable, scheduledCommsTable } from "@workspace/db";
import { computeReadiness } from "../lib/readiness";
import {
  CreateHireBody,
  UpdateHireBody,
  UpdateHireParams,
  GetHireParams,
  DeleteHireParams,
  ListHiresQueryParams,
  GetHireResponse,
  UpdateHireResponse,
  ListHiresResponse,
  CreateHireResponse,
} from "@workspace/api-zod";
import { upsertCommunicationTask } from "../lib/communication-tasks";
import { reconcileChecklistTasksForHire } from "../lib/hire-task-checklists";

const router = Router();

// GET /hires
router.get("/hires", async (req, res): Promise<void> => {
  const parsed = ListHiresQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { orientationDate, search, orientationType } = parsed.data;
  const conditions = [];
  if (orientationDate) conditions.push(eq(hiresTable.orientationDate, orientationDate));
  if (orientationType) conditions.push(eq(hiresTable.orientationType, orientationType));
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        ilike(hiresTable.firstName, term),
        ilike(hiresTable.lastName, term),
        ilike(hiresTable.email, term),
        ilike(hiresTable.title, term),
        ilike(hiresTable.location, term),
        ilike(hiresTable.hiringManager, term),
        ilike(hiresTable.recruiter, term),
      )
    );
  }
  const rows = conditions.length > 0
    ? await db.select().from(hiresTable).where(and(...conditions))
    : await db.select().from(hiresTable);

  // Task counts per hire for readiness scoring
  const allTasks = await db.select().from(hireTasksTable);
  const taskCountByHire = new Map<number, number>();
  for (const t of allTasks) {
    taskCountByHire.set(t.hireId, (taskCountByHire.get(t.hireId) ?? 0) + 1);
  }

  const hires = rows
    .map(h => ({
      ...toHireResponse(h),
      readinessScore: computeReadiness(h, taskCountByHire.get(h.id) ?? 0).score,
    }))
    .sort((a, b) => {
      const dateDiff = a.orientationDate.localeCompare(b.orientationDate);
      if (dateDiff !== 0) return dateDiff;
      return (a.readinessScore ?? 0) - (b.readinessScore ?? 0); // least ready first within same date
    });
  res.json(ListHiresResponse.parse(hires));
});

// POST /hires
router.post("/hires", async (req, res): Promise<void> => {
  const parsed = CreateHireBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [hire] = await db.insert(hiresTable).values(parsed.data).returning();
  res.status(201).json(CreateHireResponse.parse(toHireResponse(hire)));
});

// GET /hires/:id
router.get("/hires/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = GetHireParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [hire] = await db.select().from(hiresTable).where(eq(hiresTable.id, id));
  if (!hire) {
    res.status(404).json({ error: "Hire not found" });
    return;
  }
  res.json(GetHireResponse.parse(toHireResponse(hire)));
});

// PATCH /hires/:id
router.patch("/hires/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const paramParsed = UpdateHireParams.safeParse({ id });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateHireBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const [hire] = await db
    .update(hiresTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(eq(hiresTable.id, id))
    .returning();
  if (!hire) {
    res.status(404).json({ error: "Hire not found" });
    return;
  }
  await reconcileChecklistTasksForHire(id);
  res.json(UpdateHireResponse.parse(toHireResponse(hire)));
});

// POST /hires/:id/vip-comms/seed
// Schedules the curated VIP communication chain. Each template is created only once per hire.
router.post("/hires/:id/vip-comms/seed", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [hire] = await db.select().from(hiresTable).where(eq(hiresTable.id, id));
  if (!hire) {
    res.status(404).json({ error: "Hire not found" });
    return;
  }
  if (!hire.isVip) {
    res.status(400).json({ error: "Mark this hire as VIP before applying a VIP communication plan." });
    return;
  }

  const vipTemplates = (await db.select().from(commTemplatesTable))
    .filter(template => template.audience === "vip")
    .sort((a, b) => a.sendDayOffset - b.sendDayOffset);
  const existingComms = await db.select().from(scheduledCommsTable)
    .where(eq(scheduledCommsTable.hireId, id));
  const existingTemplateIds = new Set(
    existingComms.map(comm => comm.commTemplateId).filter((templateId): templateId is number => templateId !== null)
  );

  const orientation = new Date(`${hire.orientationDate}T12:00:00`);
  const formatDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })
    .format(orientation);
  const replacements: Record<string, string> = {
    "{hireName}": `${hire.firstName} ${hire.lastName}`,
    "{managerName}": hire.hiringManager,
    "{orientationDate}": formatDate,
    "{role}": hire.title,
    "{location}": hire.location,
  };
  const personalize = (value: string) =>
    Object.entries(replacements).reduce((result, [token, replacement]) => result.replaceAll(token, replacement), value);

  const newComms = vipTemplates
    .filter(template => !existingTemplateIds.has(template.id))
    .map(template => {
      const scheduled = new Date(orientation);
      scheduled.setDate(scheduled.getDate() + template.sendDayOffset);
      return {
        hireId: id,
        commTemplateId: template.id,
        recipientType: template.recipientType,
        subject: personalize(template.subject),
        body: personalize(template.body),
        scheduledAt: scheduled.toISOString().split("T")[0],
        status: "scheduled",
      };
    });

  if (newComms.length > 0) {
    await db.transaction(async (tx) => {
      const inserted = await tx.insert(scheduledCommsTable).values(newComms).returning();
      for (const comm of inserted) await upsertCommunicationTask(tx, comm);
    });
  }

  res.status(201).json({
    created: newComms.length,
    skipped: vipTemplates.length - newComms.length,
    scenario: hire.vipScenario ?? "VIP Onboarding",
  });
});

// DELETE /hires/:id
router.delete("/hires/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = DeleteHireParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [hire] = await db.delete(hiresTable).where(eq(hiresTable.id, id)).returning();
  if (!hire) {
    res.status(404).json({ error: "Hire not found" });
    return;
  }
  res.status(204).send();
});

function toHireResponse(hire: typeof hiresTable.$inferSelect) {
  return {
    ...hire,
    department: hire.department ?? null,
    functionalManager: hire.functionalManager ?? null,
    managerInPerson: hire.managerInPerson ?? null,
    inPersonBuddy: hire.inPersonBuddy ?? null,
    laptopType: hire.laptopType ?? null,
    laptopTrackingNumber: hire.laptopTrackingNumber ?? null,
    shippingAddress: hire.shippingAddress ?? null,
    notes: hire.notes ?? null,
    jiraTicketUrl: hire.jiraTicketUrl ?? null,
    isVip: hire.isVip,
    vipScenario: hire.vipScenario ?? null,
    createdAt: hire.createdAt.toISOString(),
    updatedAt: hire.updatedAt.toISOString(),
  };
}

export default router;
