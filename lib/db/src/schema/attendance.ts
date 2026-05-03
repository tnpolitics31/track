import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const attendanceMembersTable = sqliteTable("attendance_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slot: text("slot").notNull().unique(),
  name: text("name").notNull(),
  updatedAt: text("updated_at").notNull().default(""),
});

export const attendanceRecordsTable = sqliteTable("attendance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  conservativeStatus: text("conservative_status").notNull().default("present"),
  speechUrl: text("speech_url"),
  opponent1Status: text("opponent_1_status").notNull().default("present"),
  opponent2Status: text("opponent_2_status").notNull().default("present"),
  opponent3Status: text("opponent_3_status").notNull().default("present"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export type AttendanceMember = typeof attendanceMembersTable.$inferSelect;
export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
