import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const politiciansTable = pgTable("politicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  partyId: integer("party_id"),
  twitterHandle: text("twitter_handle"),
  constituency: text("constituency"),
  role: text("role"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Politician = typeof politiciansTable.$inferSelect;
