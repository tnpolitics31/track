import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const attendanceMembersTable = pgTable("attendance_members", {
  id: serial("id").primaryKey(),
  slot: text("slot").notNull().unique(),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const attendanceRecordsTable = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  conservativeStatus: text("conservative_status").notNull().default("present"),
  speechUrl: text("speech_url"),
  opponent1Status: text("opponent_1_status").notNull().default("present"),
  opponent2Status: text("opponent_2_status").notNull().default("present"),
  opponent3Status: text("opponent_3_status").notNull().default("present"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AttendanceMember = typeof attendanceMembersTable.$inferSelect;
export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
