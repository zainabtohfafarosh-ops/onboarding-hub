import { Router } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, hiresTable, hireTasksTable, scheduledCommsTable } from "@workspace/db";
import {
  GetDashboardResponse,
  GetUpcomingOrientationsResponse,
  GetOrientationByDateResponse,
  GetOrientationByDateParams,
} from "@workspace/api-zod";
import { computeReadiness } from "../lib/readiness";

const router = Router();

// GET /dashboard
router.get("/dashboard", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  // All upcoming hires (orientation date >= today)
  const allHires = await db.select().from(hiresTable);
  const upcomingHires = allHires.filter(h => h.orientationDate >= today);

  // Sort upcoming by date
  upcomingHires.sort((a, b) => a.orientationDate.localeCompare(b.orientationDate));

  const nextOrientation = upcomingHires[0]?.orientationDate ?? null;
  const nextCount = nextOrientation
    ? upcomingHires.filter(h => h.orientationDate === nextOrientation).length
    : 0;

  const inPersonCount = allHires.filter(h => h.orientationType === "in-person").length;
  const virtualCount = allHires.filter(h => h.orientationType === "virtual").length;

  // Pending tasks (all incomplete)
  const allTasks = await db.select().from(hireTasksTable).where(eq(hireTasksTable.completed, false));

  // Pending tasks for hires starting within the next 28 days
  const fourWeeksFromNow = new Date();
  fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);
  const fourWeeksStr = fourWeeksFromNow.toISOString().split("T")[0];
  const nextFourWeekHireIds = new Set(
    upcomingHires.filter(h => h.orientationDate <= fourWeeksStr).map(h => h.id)
  );
  const pendingTasks = allTasks.filter(t => nextFourWeekHireIds.has(t.hireId)).length;

  // Overdue: tasks past due + comms past scheduled date
  const overdueTasks = allTasks.filter(t => t.dueDate && t.dueDate < today).length;

  // Pending comms (scheduled, not sent)
  const pendingCommsRows = await db.select().from(scheduledCommsTable).where(eq(scheduledCommsTable.status, "scheduled"));
  const pendingComms = pendingCommsRows.length;
  const overdueComms = pendingCommsRows.filter(c => c.scheduledAt < today).length;

  const overdueActions = overdueTasks + overdueComms;

  // Task counts per upcoming hire (all tasks, not just incomplete, for readiness)
  const allUpcomingTasks = await db.select().from(hireTasksTable);
  const taskCountByHire = new Map<number, number>();
  for (const t of allUpcomingTasks) {
    taskCountByHire.set(t.hireId, (taskCountByHire.get(t.hireId) ?? 0) + 1);
  }

  // Readiness alerts — upcoming hires that aren't at 100%
  const readinessAlerts = upcomingHires
    .map(h => {
      const { score, missing } = computeReadiness(h, taskCountByHire.get(h.id) ?? 0);
      return {
        hireId: h.id,
        hireName: `${h.firstName} ${h.lastName}`,
        orientationDate: h.orientationDate,
        score,
        missing,
      };
    })
    .filter(r => r.score < 100)
    // Sort: soonest start date first, then lowest score first within same date
    .sort((a, b) => {
      const dateDiff = a.orientationDate.localeCompare(b.orientationDate);
      if (dateDiff !== 0) return dateDiff;
      return a.score - b.score;
    });

  const nextOrientationHires = nextOrientation
    ? upcomingHires
        .filter(h => h.orientationDate === nextOrientation)
        .map(h => ({
          id: h.id,
          firstName: h.firstName,
          lastName: h.lastName,
          title: h.title,
          hiringManager: h.hiringManager,
          recruiter: h.recruiter,
          orientationType: h.orientationType,
          location: h.location,
          jiraTicketUrl: h.jiraTicketUrl ?? null,
        }))
    : [];

  const stats = {
    totalUpcomingHires: upcomingHires.length,
    nextOrientationDate: nextOrientation,
    nextOrientationCount: nextCount,
    pendingTasks,
    overdueTasks,
    overdueActions,
    pendingComms,
    totalHiresAllTime: allHires.length,
    orientationTypeCounts: {
      inPerson: inPersonCount,
      virtual: virtualCount,
    },
    readinessAlerts,
    nextOrientationHires,
  };

  res.json(GetDashboardResponse.parse(stats));
});

// GET /orientations/upcoming
router.get("/orientations/upcoming", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const allHires = await db.select().from(hiresTable);
  const upcomingHires = allHires.filter(h => h.orientationDate >= today);

  // Group by date
  const dateMap = new Map<string, typeof hiresTable.$inferSelect[]>();
  for (const hire of upcomingHires) {
    if (!dateMap.has(hire.orientationDate)) dateMap.set(hire.orientationDate, []);
    dateMap.get(hire.orientationDate)!.push(hire);
  }

  // Get task and comm counts per hire
  const allTasks = await db.select().from(hireTasksTable).where(eq(hireTasksTable.completed, false));
  const allComms = await db.select().from(scheduledCommsTable).where(eq(scheduledCommsTable.status, "scheduled"));

  const tasksByHire = new Map<number, number>();
  for (const t of allTasks) {
    tasksByHire.set(t.hireId, (tasksByHire.get(t.hireId) || 0) + 1);
  }
  const commsByHire = new Map<number, number>();
  for (const c of allComms) {
    commsByHire.set(c.hireId, (commsByHire.get(c.hireId) || 0) + 1);
  }

  const summaries = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, hires]) => {
      const locations = [...new Set(hires.map(h => h.location))];
      const pendingTasksCount = hires.reduce((sum, h) => sum + (tasksByHire.get(h.id) || 0), 0);
      const pendingCommsCount = hires.reduce((sum, h) => sum + (commsByHire.get(h.id) || 0), 0);
      return {
        date,
        totalHires: hires.length,
        inPersonCount: hires.filter(h => h.orientationType === "in-person").length,
        virtualCount: hires.filter(h => h.orientationType === "virtual").length,
        locations,
        pendingTasksCount,
        pendingCommsCount,
      };
    });

  res.json(GetUpcomingOrientationsResponse.parse(summaries));
});

// GET /orientations/all (for the orientations page — all dates)
router.get("/orientations", async (req, res): Promise<void> => {
  const allHires = await db.select().from(hiresTable);

  const dateMap = new Map<string, typeof hiresTable.$inferSelect[]>();
  for (const hire of allHires) {
    if (!dateMap.has(hire.orientationDate)) dateMap.set(hire.orientationDate, []);
    dateMap.get(hire.orientationDate)!.push(hire);
  }

  const allTasks = await db.select().from(hireTasksTable).where(eq(hireTasksTable.completed, false));
  const allComms = await db.select().from(scheduledCommsTable).where(eq(scheduledCommsTable.status, "scheduled"));

  const tasksByHire = new Map<number, number>();
  for (const t of allTasks) tasksByHire.set(t.hireId, (tasksByHire.get(t.hireId) || 0) + 1);
  const commsByHire = new Map<number, number>();
  for (const c of allComms) commsByHire.set(c.hireId, (commsByHire.get(c.hireId) || 0) + 1);

  const summaries = Array.from(dateMap.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([date, hires]) => ({
      date,
      totalHires: hires.length,
      inPersonCount: hires.filter(h => h.orientationType === "in-person").length,
      virtualCount: hires.filter(h => h.orientationType === "virtual").length,
      locations: [...new Set(hires.map(h => h.location))],
      pendingTasksCount: hires.reduce((s, h) => s + (tasksByHire.get(h.id) || 0), 0),
      pendingCommsCount: hires.reduce((s, h) => s + (commsByHire.get(h.id) || 0), 0),
    }));

  res.json(summaries);
});

// GET /orientations/:date
router.get("/orientations/:date", async (req, res): Promise<void> => {
  const date = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;
  const paramParsed = GetOrientationByDateParams.safeParse({ date });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }

  const hires = await db.select().from(hiresTable).where(eq(hiresTable.orientationDate, date));
  if (hires.length === 0) {
    res.status(404).json({ error: "No orientation found for this date" });
    return;
  }

  const detail = {
    date,
    totalHires: hires.length,
    inPersonCount: hires.filter(h => h.orientationType === "in-person").length,
    virtualCount: hires.filter(h => h.orientationType === "virtual").length,
    hires: hires.map(h => ({
      ...h,
      department: h.department ?? null,
      laptopTrackingNumber: h.laptopTrackingNumber ?? null,
      shippingAddress: h.shippingAddress ?? null,
      notes: h.notes ?? null,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    })),
  };

  res.json(GetOrientationByDateResponse.parse(detail));
});

export default router;
