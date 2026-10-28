import { pgTable, serial, text, boolean, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hiresTable } from "./hires";
import { scheduledCommsTable } from "./comms";

export const hireTasksTable = pgTable(
  "hire_tasks",
  {
    id: serial("id").primaryKey(),
    hireId: integer("hire_id").notNull().references(() => hiresTable.id, { onDelete: "cascade" }),
    scheduledCommId: integer("scheduled_comm_id")
      .unique()
      .references(() => scheduledCommsTable.id, { onDelete: "cascade" }),
    templateKey: text("template_key"),
    title: text("title").notNull(),
    description: text("description"),
    completed: boolean("completed").notNull().default(false),
    dueDate: text("due_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("hire_tasks_hire_template_key_idx").on(table.hireId, table.templateKey)],
);

export const insertHireTaskSchema = createInsertSchema(hireTasksTable).omit({ id: true, createdAt: true });
export type InsertHireTask = z.infer<typeof insertHireTaskSchema>;
export type HireTask = typeof hireTasksTable.$inferSelect;

export const taskTemplatesTable = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  applicableTo: text("applicable_to").notNull().default("all"), // 'virtual' | 'in-person' | 'all'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplatesTable).omit({ id: true, createdAt: true });
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplatesTable.$inferSelect;
