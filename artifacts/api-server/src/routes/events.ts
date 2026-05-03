import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, tweetsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

// GET /events
router.get("/", async (_req, res) => {
  const rows = await db
    .select({
      id: eventsTable.id,
      name: eventsTable.name,
      description: eventsTable.description,
      startDate: eventsTable.startDate,
      endDate: eventsTable.endDate,
      createdAt: eventsTable.createdAt,
      tweetCount: count(tweetsTable.id),
    })
    .from(eventsTable)
    .leftJoin(tweetsTable, eq(tweetsTable.eventId, eventsTable.id))
    .groupBy(eventsTable.id)
    .orderBy(desc(eventsTable.createdAt));
  return res.json(rows);
});

// POST /events — admin only
router.post("/", requireAdmin, async (req, res) => {
  const { name, description, startDate, endDate } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  const [event] = await db.insert(eventsTable).values({
    name: name.trim(),
    description: description?.trim() || null,
    startDate: startDate || null,
    endDate: endDate || null,
  }).returning();
  return res.status(201).json(event);
});

// PUT /events/:id — admin only
router.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, startDate, endDate } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  const [updated] = await db.update(eventsTable).set({
    name: name.trim(),
    description: description?.trim() || null,
    startDate: startDate || null,
    endDate: endDate || null,
  }).where(eq(eventsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Event not found." });
  return res.json(updated);
});

// DELETE /events/:id — admin only
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Event not found." });
  return res.status(204).send();
});

export default router;
