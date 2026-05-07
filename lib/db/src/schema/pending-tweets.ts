import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const pendingTweetsTable = sqliteTable("pending_tweets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull().unique(),
  tweetId: text("tweet_id").notNull(),
  authorHandle: text("author_handle"),
  authorName: text("author_name"),
  content: text("content"),
  type: text("type", { enum: ["text", "image", "mixed", "unknown"] }).notNull().default("unknown"),
  sentiment: text("sentiment", { enum: ["positive", "negative", "neutral", "attack", "promise"] }),
  submittedByHandle: text("submitted_by_handle"),
  mentionTweetId: text("mention_tweet_id").unique(),
  partyId: integer("party_id"),
  politicianId: integer("politician_id"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(""),
});

export type PendingTweet = typeof pendingTweetsTable.$inferSelect;
