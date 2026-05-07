import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const eventsTable = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: text("created_at").notNull().default(""),
});

export type PoliticalEvent = typeof eventsTable.$inferSelect;
