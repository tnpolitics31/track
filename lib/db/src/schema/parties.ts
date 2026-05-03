import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const partiesTable = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Party = typeof partiesTable.$inferSelect;
