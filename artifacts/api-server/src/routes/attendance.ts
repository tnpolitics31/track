import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceMembersTable, attendanceRecordsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

const DEFAULT_MEMBERS = [
  { slot: "conservative", name: "Conservative Member" },
  { slot: "opponent_1", name: "Opponent 1" },
  { slot: "opponent_2", name: "Opponent 2" },
  { slot: "opponent_3", name: "Opponent 3" },
];

async function ensureMembers() {
  for (const m of DEFAULT_MEMBERS) {
    const existing = await db
      .select()
      .from(attendanceMembersTable)
      .where(eq(attendanceMembersTable.slot, m.slot))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(attendanceMembersTable).values(m);
    }
  }
}

// GET /attendance/members
router.get("/members", async (_req, res) => {
  await ensureMembers();
  const members = await db
    .select()
    .from(attendanceMembersTable)
    .orderBy(attendanceMembersTable.id);
  return res.json(members);
});

// PUT /attendance/members/:slot — admin only
router.put("/members/:slot", requireAdmin, async (req, res) => {
  const { slot } = req.params;
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }
  const validSlots = ["conservative", "opponent_1", "opponent_2", "opponent_3"];
  if (!validSlots.includes(slot)) {
    return res.status(400).json({ error: "Invalid slot." });
  }
  await ensureMembers();
  const [updated] = await db
    .update(attendanceMembersTable)
    .set({ name: name.trim(), updatedAt: new Date().toISOString() })
    .where(eq(attendanceMembersTable.slot, slot))
    .returning();
  return res.json(updated);
});

// GET /attendance/records
router.get("/records", async (_req, res) => {
  const records = await db
    .select()
    .from(attendanceRecordsTable)
    .orderBy(desc(attendanceRecordsTable.date), desc(attendanceRecordsTable.createdAt));
  return res.json(records);
});

// POST /attendance/records
router.post("/records", async (req, res) => {
  const { date, conservativeStatus, speechUrl, opponent1Status, opponent2Status, opponent3Status, notes } = req.body;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Date is required." });
  }
  const validStatuses = ["present", "absent"];
  if (!validStatuses.includes(conservativeStatus) ||
      !validStatuses.includes(opponent1Status) ||
      !validStatuses.includes(opponent2Status) ||
      !validStatuses.includes(opponent3Status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  const [record] = await db
    .insert(attendanceRecordsTable)
    .values({
      date,
      conservativeStatus,
      speechUrl: speechUrl?.trim() || null,
      opponent1Status,
      opponent2Status,
      opponent3Status,
      notes: notes?.trim() || null,
    })
    .returning();
  return res.status(201).json(record);
});

// DELETE /attendance/records/:id — admin only
router.delete("/records/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid ID." });
  const [deleted] = await db
    .delete(attendanceRecordsTable)
    .where(eq(attendanceRecordsTable.id, id))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Record not found." });
  return res.status(204).send();
});

export default router;
