import { Router } from "express";
import { db } from "@workspace/db";
import { partiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

const DEFAULT_PARTIES = [
  { name: "DMK", shortName: "DMK", color: "#e63946", description: "Dravida Munnetra Kazhagam" },
  { name: "TVK", shortName: "TVK", color: "#2a9d8f", description: "Tamilaga Vettri Kazhagam" },
  { name: "ADMK", shortName: "ADMK", color: "#264653", description: "All India Anna Dravida Munnetra Kazhagam" },
  { name: "BJP", shortName: "BJP", color: "#e9c46a", description: "Bharatiya Janata Party" },
  { name: "INC", shortName: "INC", color: "#457b9d", description: "Indian National Congress" },
  { name: "Other", shortName: "Other", color: "#6b7280", description: "Other parties" },
];

export async function ensureDefaultParties() {
  const existing = await db.select().from(partiesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(partiesTable).values(DEFAULT_PARTIES);
  }
}

// GET /parties
router.get("/", async (_req, res) => {
  await ensureDefaultParties();
  const parties = await db.select().from(partiesTable).orderBy(partiesTable.id);
  return res.json(parties);
});

// POST /parties — admin only
router.post("/", requireAdmin, async (req, res) => {
  const { name, shortName, color, description } = req.body;
  if (!name?.trim() || !shortName?.trim()) {
    return res.status(400).json({ error: "Name and short name are required." });
  }
  const [party] = await db.insert(partiesTable).values({ name: name.trim(), shortName: shortName.trim().toUpperCase(), color: color ?? "#6b7280", description: description?.trim() ?? null }).returning();
  return res.status(201).json(party);
});

// PUT /parties/:id — admin only
router.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, shortName, color, description } = req.body;
  if (!name?.trim() || !shortName?.trim()) return res.status(400).json({ error: "Name and short name are required." });
  const [updated] = await db.update(partiesTable).set({ name: name.trim(), shortName: shortName.trim().toUpperCase(), color, description: description?.trim() ?? null }).where(eq(partiesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Party not found." });
  return res.json(updated);
});

// DELETE /parties/:id — admin only
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(partiesTable).where(eq(partiesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Party not found." });
  return res.status(204).send();
});

export default router;
