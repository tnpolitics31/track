import { Router } from "express";
import { db } from "@workspace/db";
import { politiciansTable, partiesTable } from "@workspace/db";
import { eq, like, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

// GET /politicians?party_id=&search=
router.get("/", async (req, res) => {
  const { party_id, search } = req.query;
  const conditions = [];
  if (party_id) conditions.push(eq(politiciansTable.partyId, Number(party_id)));
  if (search && typeof search === "string") conditions.push(like(politiciansTable.name, `%${search}%`));

  const rows = await db
    .select({
      id: politiciansTable.id,
      name: politiciansTable.name,
      partyId: politiciansTable.partyId,
      twitterHandle: politiciansTable.twitterHandle,
      constituency: politiciansTable.constituency,
      role: politiciansTable.role,
      bio: politiciansTable.bio,
      createdAt: politiciansTable.createdAt,
      partyName: partiesTable.name,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
    })
    .from(politiciansTable)
    .leftJoin(partiesTable, eq(politiciansTable.partyId, partiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(politiciansTable.name);

  return res.json(rows);
});

// GET /politicians/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select({
      id: politiciansTable.id,
      name: politiciansTable.name,
      partyId: politiciansTable.partyId,
      twitterHandle: politiciansTable.twitterHandle,
      constituency: politiciansTable.constituency,
      role: politiciansTable.role,
      bio: politiciansTable.bio,
      createdAt: politiciansTable.createdAt,
      partyName: partiesTable.name,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
    })
    .from(politiciansTable)
    .leftJoin(partiesTable, eq(politiciansTable.partyId, partiesTable.id))
    .where(eq(politiciansTable.id, id))
    .limit(1);
  if (!row) return res.status(404).json({ error: "Politician not found." });
  return res.json(row);
});

// POST /politicians — admin only
router.post("/", requireAdmin, async (req, res) => {
  const { name, partyId, twitterHandle, constituency, role, bio } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  const [p] = await db.insert(politiciansTable).values({
    name: name.trim(),
    partyId: partyId ? Number(partyId) : null,
    twitterHandle: twitterHandle?.replace(/^@/, "").trim() || null,
    constituency: constituency?.trim() || null,
    role: role?.trim() || null,
    bio: bio?.trim() || null,
  }).returning();
  return res.status(201).json(p);
});

// PUT /politicians/:id — admin only
router.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, partyId, twitterHandle, constituency, role, bio } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  const [updated] = await db.update(politiciansTable).set({
    name: name.trim(),
    partyId: partyId ? Number(partyId) : null,
    twitterHandle: twitterHandle?.replace(/^@/, "").trim() || null,
    constituency: constituency?.trim() || null,
    role: role?.trim() || null,
    bio: bio?.trim() || null,
  }).where(eq(politiciansTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Politician not found." });
  return res.json(updated);
});

// DELETE /politicians/:id — admin only
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(politiciansTable).where(eq(politiciansTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Politician not found." });
  return res.status(204).send();
});

export default router;
