import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tweetsTable = sqliteTable("tweets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull().unique(),
  tweetId: text("tweet_id").notNull(),
  authorHandle: text("author_handle"),
  authorName: text("author_name"),
  content: text("content"),
  type: text("type", { enum: ["text", "image", "mixed", "unknown"] }).notNull().default("unknown"),
  screenshotUrl: text("screenshot_url"),
  tags: text("tags"),
  notes: text("notes"),
  partyId: integer("party_id"),
  politicianId: integer("politician_id"),
  eventId: integer("event_id"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertTweetSchema = createInsertSchema(tweetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTweet = z.infer<typeof insertTweetSchema>;
export type Tweet = typeof tweetsTable.$inferSelect;
