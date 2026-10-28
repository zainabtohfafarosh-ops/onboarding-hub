import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type OrientationScheduleSnapshot = {
  templateId: number;
  templateName: string;
  category: string;
  locations: string[];
  hireIds: number[];
  hireNames: string[];
};

export const orientationScheduleTemplatesTable = pgTable("orientation_schedule_templates", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  locations: text("locations").array().notNull(),
  audience: text("audience").notNull(),
  timezone: text("timezone").notNull(),
  duration: text("duration").notNull(),
  accent: text("accent").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orientationScheduleDraftsTable = pgTable(
  "orientation_schedule_drafts",
  {
    id: serial("id").primaryKey(),
    orientationDate: date("orientation_date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    status: text("status").notNull().default("draft"),
    sourceTemplateIds: integer("source_template_ids").array().notNull(),
    templateSnapshot: jsonb("template_snapshot").$type<OrientationScheduleSnapshot[]>().notNull(),
    cohortSignature: text("cohort_signature").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("orientation_schedule_drafts_orientation_date_idx").on(table.orientationDate)],
);

export const insertOrientationScheduleTemplateSchema = createInsertSchema(orientationScheduleTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertOrientationScheduleDraftSchema = createInsertSchema(orientationScheduleDraftsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrientationScheduleTemplate = z.infer<typeof insertOrientationScheduleTemplateSchema>;
export type OrientationScheduleTemplate = typeof orientationScheduleTemplatesTable.$inferSelect;
export type InsertOrientationScheduleDraft = z.infer<typeof insertOrientationScheduleDraftSchema>;
export type OrientationScheduleDraft = typeof orientationScheduleDraftsTable.$inferSelect;