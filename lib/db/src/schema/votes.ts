import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const tweetVotesTable = sqliteTable("tweet_votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tweetId: integer("tweet_id").notNull(),
  voteType: text("vote_type", { enum: ["like", "dislike"] }).notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export type TweetVote = typeof tweetVotesTable.$inferSelect;
