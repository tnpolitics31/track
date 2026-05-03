import { pgTable, serial, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tweetTypeEnum = pgEnum("tweet_type", ["text", "image", "mixed", "unknown"]);

export const tweetsTable = pgTable("tweets", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  tweetId: text("tweet_id").notNull(),
  authorHandle: text("author_handle"),
  authorName: text("author_name"),
  content: text("content"),
  type: tweetTypeEnum("type").notNull().default("unknown"),
  screenshotUrl: text("screenshot_url"),
  tags: text("tags"),
  notes: text("notes"),
  partyId: integer("party_id"),
  politicianId: integer("politician_id"),
  eventId: integer("event_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTweetSchema = createInsertSchema(tweetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTweet = z.infer<typeof insertTweetSchema>;
export type Tweet = typeof tweetsTable.$inferSelect;
