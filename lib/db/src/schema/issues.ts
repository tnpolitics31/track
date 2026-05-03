import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const issuesTable = sqliteTable("issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["death", "protest", "scheme", "objection", "disaster", "controversy", "newsletter", "other"],
  }).notNull().default("other"),
  dateOccurred: text("date_occurred"),
  sourceUrl: text("source_url"),
  location: text("location"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const issueActionsTable = sqliteTable("issue_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  issueId: integer("issue_id").notNull(),
  partyId: integer("party_id"),
  politicianId: integer("politician_id"),
  actionType: text("action_type", {
    enum: ["visited", "protested", "issued_statement", "introduced_scheme", "condemned", "supported", "objected", "absent", "went_abroad", "did_nothing", "other"],
  }).notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(""),
});

export type Issue = typeof issuesTable.$inferSelect;
export type IssueAction = typeof issueActionsTable.$inferSelect;
