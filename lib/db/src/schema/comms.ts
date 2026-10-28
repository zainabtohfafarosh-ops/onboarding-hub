import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hiresTable } from "./hires";

export const commTemplatesTable = pgTable("comm_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  recipientType: text("recipient_type").notNull(), // 'hire' | 'hiring-manager'
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sendDayOffset: integer("send_day_offset").notNull().default(-7),
    timingDescription: text("timing_description").notNull().default("Relative to orientation date"),
    applicableTo: text("applicable_to").notNull().default("all"), // 'virtual' | 'in-person' | 'all'
  audience: text("audience").notNull().default("standard"), // 'standard' | 'vip'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCommTemplateSchema = createInsertSchema(commTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommTemplate = z.infer<typeof insertCommTemplateSchema>;
export type CommTemplate = typeof commTemplatesTable.$inferSelect;

export const scheduledCommsTable = pgTable("scheduled_comms", {
  id: serial("id").primaryKey(),
  hireId: integer("hire_id").notNull().references(() => hiresTable.id, { onDelete: "cascade" }),
  commTemplateId: integer("comm_template_id"),
  recipientType: text("recipient_type").notNull(), // 'hire' | 'hiring-manager'
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  sentAt: text("sent_at"),
  status: text("status").notNull().default("scheduled"), // 'scheduled' | 'sent' | 'cancelled' | 'edited'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScheduledCommSchema = createInsertSchema(scheduledCommsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScheduledComm = z.infer<typeof insertScheduledCommSchema>;
export type ScheduledComm = typeof scheduledCommsTable.$inferSelect;
