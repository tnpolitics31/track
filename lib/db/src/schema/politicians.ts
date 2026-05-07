import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const politiciansTable = sqliteTable("politicians", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  partyId: integer("party_id"),
  twitterHandle: text("twitter_handle"),
  constituency: text("constituency"),
  role: text("role"),
  bio: text("bio"),
  createdAt: text("created_at").notNull().default(""),
});

export type Politician = typeof politiciansTable.$inferSelect;
