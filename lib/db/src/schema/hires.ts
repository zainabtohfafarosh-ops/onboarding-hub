import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hiresTable = pgTable("hires", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  title: text("title").notNull(),
  department: text("department"),
  location: text("location").notNull(),
  orientationType: text("orientation_type").notNull(), // 'in-person' | 'virtual'
  orientationDate: text("orientation_date").notNull(), // YYYY-MM-DD
  hiringManager: text("hiring_manager").notNull(),
  recruiter: text("recruiter").notNull(),
  laptopTrackingNumber: text("laptop_tracking_number"),
  shippingAddress: text("shipping_address"),
  addressSharedWithIT: boolean("address_shared_with_it").notNull().default(false),
  functionalManager: text("functional_manager"),
  managerInPerson: boolean("manager_in_person"),
  inPersonBuddy: text("in_person_buddy"),
  laptopType: text("laptop_type"), // 'mac' | 'pc' | null (not applicable for Mumbai)
  status: text("status").notNull().default("confirmed"), // 'confirmed' | 'pending' | 'cancelled'
  notes: text("notes"),
  jiraTicketUrl: text("jira_ticket_url"),
  isVip: boolean("is_vip").notNull().default(false),
  vipScenario: text("vip_scenario"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHireSchema = createInsertSchema(hiresTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHire = z.infer<typeof insertHireSchema>;
export type Hire = typeof hiresTable.$inferSelect;
