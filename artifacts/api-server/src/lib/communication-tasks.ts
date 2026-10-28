import { eq } from "drizzle-orm";
import {
  db,
  hireTasksTable,
  scheduledCommsTable,
  type ScheduledComm,
} from "@workspace/db";

type DbExecutor = Pick<typeof db, "select" | "insert" | "update">;

export function communicationTaskFields(comm: ScheduledComm) {
  const recipientLabel = comm.recipientType === "hiring-manager" ? "hiring manager" : "hire";
  return {
    hireId: comm.hireId,
    scheduledCommId: comm.id,
    title: `Send email to ${recipientLabel}: ${comm.subject}`,
    description: `Scheduled for ${comm.scheduledAt}. This task is completed automatically when the communication is marked sent.`,
    dueDate: comm.scheduledAt,
  };
}

export async function upsertCommunicationTask(executor: DbExecutor, comm: ScheduledComm) {
  const [existing] = await executor
    .select()
    .from(hireTasksTable)
    .where(eq(hireTasksTable.scheduledCommId, comm.id));
  const fields = communicationTaskFields(comm);

  if (existing) {
    const [task] = await executor
      .update(hireTasksTable)
      .set({
        ...fields,
        completed: existing.completed || comm.status === "sent",
      })
      .where(eq(hireTasksTable.id, existing.id))
      .returning();
    return { task, created: false };
  }

  const [task] = await executor
    .insert(hireTasksTable)
    .values({ ...fields, completed: comm.status === "sent" })
    .onConflictDoNothing({ target: hireTasksTable.scheduledCommId })
    .returning();

  if (task) return { task, created: true };

  const [concurrentTask] = await executor
    .select()
    .from(hireTasksTable)
    .where(eq(hireTasksTable.scheduledCommId, comm.id));
  return { task: concurrentTask, created: false };
}

export async function reconcileCommunicationTasksForHire(hireId: number) {
  let created = 0;
  await db.transaction(async (tx) => {
    const comms = await tx
      .select()
      .from(scheduledCommsTable)
      .where(eq(scheduledCommsTable.hireId, hireId))
      .for("update");

    for (const comm of comms) {
      const result = await upsertCommunicationTask(tx, comm);
      if (result.created) created += 1;
    }
  });
  return created;
}