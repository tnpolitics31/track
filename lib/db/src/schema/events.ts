import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PoliticalEvent = typeof eventsTable.$inferSelect;
