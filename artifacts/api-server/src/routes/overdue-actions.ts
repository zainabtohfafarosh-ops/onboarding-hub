import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, hiresTable, hireTasksTable, scheduledCommsTable } from "@workspace/db";

const router = Router();

// GET /overdue-actions
router.get("/overdue-actions", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  // All hires (for name lookup)
  const allHires = await db.select().from(hiresTable);
  const hireMap = new Map(allHires.map(h => [h.id, h]));

  const daysPast = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date(today);
    return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Overdue tasks: incomplete, dueDate < today
  const overdueTasks = (await db.select().from(hireTasksTable))
    .filter(t => !t.completed && t.dueDate && t.dueDate < today)
    .map(t => {
      const hire = hireMap.get(t.hireId);
      return {
        type: "task" as const,
        id: t.id,
        hireId: t.hireId,
        hireName: hire ? `${hire.firstName} ${hire.lastName}` : "Unknown",
        orientationDate: hire?.orientationDate ?? null,
        title: t.title,
        description: t.description ?? null,
        dueDate: t.dueDate!,
        daysPastDue: daysPast(t.dueDate!),
      };
    });

  // Overdue comms: status=scheduled, scheduledAt < today
  const overdueComms = (
    await db.select().from(scheduledCommsTable).where(eq(scheduledCommsTable.status, "scheduled"))
  )
    .filter(c => c.scheduledAt < today)
    .map(c => {
      const hire = hireMap.get(c.hireId);
      return {
        type: "comm" as const,
        id: c.id,
        hireId: c.hireId,
        hireName: hire ? `${hire.firstName} ${hire.lastName}` : "Unknown",
        orientationDate: hire?.orientationDate ?? null,
        title: c.subject,
        description: `To: ${c.recipientType === "hire" ? "New hire" : "Hiring manager"}`,
        dueDate: c.scheduledAt,
        daysPastDue: daysPast(c.scheduledAt),
      };
    });

  const combined = [...overdueTasks, ...overdueComms].sort(
    (a, b) => b.daysPastDue - a.daysPastDue
  );

  res.json(combined);
});

export default router;
