import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const partiesTable = sqliteTable("parties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),
  createdAt: text("created_at").notNull().default(""),
});

export type Party = typeof partiesTable.$inferSelect;
