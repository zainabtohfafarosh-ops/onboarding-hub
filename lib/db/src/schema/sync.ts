import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const syncStatusTable = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  lastSyncAt: text("last_sync_at"),
  hiresAdded: integer("hires_added").notNull().default(0),
  hiresUpdated: integer("hires_updated").notNull().default(0),
  status: text("status").notNull().default("never"), // 'success' | 'error' | 'never'
  errorMessage: text("error_message"),
  spreadsheetId: text("spreadsheet_id"),
  sheetName: text("sheet_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSyncStatusSchema = createInsertSchema(syncStatusTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSyncStatus = z.infer<typeof insertSyncStatusSchema>;
export type SyncStatus = typeof syncStatusTable.$inferSelect;
