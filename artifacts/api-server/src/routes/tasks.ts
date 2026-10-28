import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, hireTasksTable, taskTemplatesTable, hiresTable } from "@workspace/db";
import {
  ListHireTasksParams,
  ListHireTasksResponse,
  CreateHireTaskParams,
  CreateHireTaskBody,
  CreateHireTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
  ListTaskTemplatesResponse,
  CreateTaskTemplateBody,
  CreateTaskTemplateResponse,
  UpdateTaskTemplateParams,
  UpdateTaskTemplateBody,
  UpdateTaskTemplateResponse,
  DeleteTaskTemplateParams,
} from "@workspace/api-zod";
import { reconcileCommunicationTasksForHire } from "../lib/communication-tasks";
import { reconcileChecklistTasksForHire } from "../lib/hire-task-checklists";

const router = Router();

// POST /hires/:hireId/tasks/seed
// Reconciles the location- and joining-mode-specific checklist for a hire.
router.post("/hires/:hireId/tasks/seed", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.hireId) ? req.params.hireId[0] : req.params.hireId;
  const hireId = parseInt(raw, 10);
  if (isNaN(hireId)) {
    res.status(400).json({ error: "Invalid hireId" });
    return;
  }

  const standardResult = await reconcileChecklistTasksForHire(hireId);
  if (!standardResult.hire) {
    res.status(404).json({ error: "Hire not found" });
    return;
  }
  const communicationResult = await reconcileCommunicationTasksForHire(hireId);
  const tasks = await db.select().from(hireTasksTable).where(eq(hireTasksTable.hireId, hireId));
  const created = standardResult.created + communicationResult;
  res.status(created > 0 ? 201 : 200).json({
    created,
    removed: standardResult.removed,
    tasks: tasks.map(toTaskResponse),
  });
});

// GET /hires/:hireId/tasks
router.get("/hires/:hireId/tasks", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.hireId) ? req.params.hireId[0] : req.params.hireId;
  const hireId = parseInt(raw, 10);
  const parsed = ListHireTasksParams.safeParse({ hireId });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid hireId" });
    return;
  }
  await reconcileChecklistTasksForHire(hireId);
  await reconcileCommunicationTasksForHire(hireId);
  const tasks = await db.select().from(hireTasksTable).where(eq(hireTasksTable.hireId, hireId));
  res.json(ListHireTasksResponse.parse(tasks.map(toTaskResponse)));
});

// POST /hires/:hireId/tasks
router.post("/hires/:hireId/tasks", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.hireId) ? req.params.hireId[0] : req.params.hireId;
  const hireId = parseInt(raw, 10);
  const paramParsed = CreateHireTaskParams.safeParse({ hireId });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid hireId" });
    return;
  }
  const bodyParsed = CreateHireTaskBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const [task] = await db.insert(hireTasksTable).values({ ...bodyParsed.data, hireId }).returning();
  res.status(201).json(CreateHireTaskResponse.parse(toTaskResponse(task)));
});

// PATCH /tasks/:id
router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const paramParsed = UpdateTaskParams.safeParse({ id });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateTaskBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const [task] = await db
    .update(hireTasksTable)
    .set(bodyParsed.data)
    .where(eq(hireTasksTable.id, id))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(toTaskResponse(task)));
});

// DELETE /tasks/:id
router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = DeleteTaskParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(hireTasksTable).where(eq(hireTasksTable.id, id));
  res.status(204).send();
});

// --- Task Templates ---

// GET /task-templates
router.get("/task-templates", async (req, res): Promise<void> => {
  const templates = await db.select().from(taskTemplatesTable);
  res.json(ListTaskTemplatesResponse.parse(templates.map(toTemplateResponse)));
});

// POST /task-templates
router.post("/task-templates", async (req, res): Promise<void> => {
  const parsed = CreateTaskTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [template] = await db.insert(taskTemplatesTable).values(parsed.data).returning();
  res.status(201).json(CreateTaskTemplateResponse.parse(toTemplateResponse(template)));
});

// PATCH /task-templates/:id
router.patch("/task-templates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const paramParsed = UpdateTaskTemplateParams.safeParse({ id });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateTaskTemplateBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const [template] = await db
    .update(taskTemplatesTable)
    .set(bodyParsed.data)
    .where(eq(taskTemplatesTable.id, id))
    .returning();
  if (!template) {
    res.status(404).json({ error: "Task template not found" });
    return;
  }
  res.json(UpdateTaskTemplateResponse.parse(toTemplateResponse(template)));
});

// DELETE /task-templates/:id
router.delete("/task-templates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = DeleteTaskTemplateParams.safeParse({ id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(taskTemplatesTable).where(eq(taskTemplatesTable.id, id));
  res.status(204).send();
});

function toTaskResponse(task: typeof hireTasksTable.$inferSelect) {
  return {
    ...task,
    description: task.description ?? null,
    dueDate: task.dueDate ?? null,
    scheduledCommId: task.scheduledCommId ?? null,
    createdAt: task.createdAt.toISOString(),
  };
}

function toTemplateResponse(t: typeof taskTemplatesTable.$inferSelect) {
  return {
    ...t,
    description: t.description ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

export default router;
