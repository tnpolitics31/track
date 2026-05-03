import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const issueCategoryEnum = pgEnum("issue_category", [
  "death",
  "protest",
  "scheme",
  "objection",
  "disaster",
  "controversy",
  "newsletter",
  "other",
]);

export const actionTypeEnum = pgEnum("action_type", [
  "visited",
  "protested",
  "issued_statement",
  "introduced_scheme",
  "condemned",
  "supported",
  "objected",
  "absent",
  "went_abroad",
  "did_nothing",
  "other",
]);

export const issuesTable = pgTable("issues", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: issueCategoryEnum("category").notNull().default("other"),
  dateOccurred: text("date_occurred"),
  sourceUrl: text("source_url"),
  location: text("location"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const issueActionsTable = pgTable("issue_actions", {
  id: serial("id").primaryKey(),
  issueId: serial("issue_id").notNull(),
  partyId: serial("party_id"),
  politicianId: serial("politician_id"),
  actionType: actionTypeEnum("action_type").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Issue = typeof issuesTable.$inferSelect;
export type IssueAction = typeof issueActionsTable.$inferSelect;
