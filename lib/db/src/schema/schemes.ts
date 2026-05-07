import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const schemesTable = sqliteTable("schemes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  partyId: integer("party_id"),
  dateAnnounced: text("date_announced"),
  manifestoPromise: integer("manifesto_promise", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["announced", "in_progress", "completed", "cancelled"] }).notNull().default("announced"),
  responseUrl: text("response_url"),
  newspaperUrl: text("newspaper_url"),
  youtubeUrl: text("youtube_url"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export type Scheme = typeof schemesTable.$inferSelect;
export type InsertScheme = typeof schemesTable.$inferInsert;
