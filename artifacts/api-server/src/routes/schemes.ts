import { Router } from "express";
import { db } from "@workspace/db";
import { schemesTable, partiesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

// GET /schemes?party_id=&manifesto=
router.get("/", async (req, res) => {
  const { party_id, manifesto } = req.query;
  const conditions = [];
  if (party_id) conditions.push(eq(schemesTable.partyId, Number(party_id)));
  if (manifesto === "true") conditions.push(eq(schemesTable.manifestoPromise, true));

  const rows = await db
    .select({
      id: schemesTable.id,
      title: schemesTable.title,
      description: schemesTable.description,
      partyId: schemesTable.partyId,
      dateAnnounced: schemesTable.dateAnnounced,
      manifestoPromise: schemesTable.manifestoPromise,
      status: schemesTable.status,
      responseUrl: schemesTable.responseUrl,
      newspaperUrl: schemesTable.newspaperUrl,
      youtubeUrl: schemesTable.youtubeUrl,
      createdAt: schemesTable.createdAt,
      updatedAt: schemesTable.updatedAt,
      partyName: partiesTable.name,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
    })
    .from(schemesTable)
    .leftJoin(partiesTable, eq(schemesTable.partyId, partiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schemesTable.createdAt));

  return res.json(rows);
});

// GET /schemes/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select({
      id: schemesTable.id,
      title: schemesTable.title,
      description: schemesTable.description,
      partyId: schemesTable.partyId,
      dateAnnounced: schemesTable.dateAnnounced,
      manifestoPromise: schemesTable.manifestoPromise,
      status: schemesTable.status,
      responseUrl: schemesTable.responseUrl,
      newspaperUrl: schemesTable.newspaperUrl,
      youtubeUrl: schemesTable.youtubeUrl,
      createdAt: schemesTable.createdAt,
      updatedAt: schemesTable.updatedAt,
      partyName: partiesTable.name,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
    })
    .from(schemesTable)
    .leftJoin(partiesTable, eq(schemesTable.partyId, partiesTable.id))
    .where(eq(schemesTable.id, id));
  if (!row) return res.status(404).json({ error: "Scheme not found." });
  return res.json(row);
});

// POST /schemes — admin only
router.post("/", requireAdmin, async (req, res) => {
  const { title, description, partyId, dateAnnounced, manifestoPromise, status, responseUrl, newspaperUrl, youtubeUrl } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  const now = new Date().toISOString();
  const [scheme] = await db.insert(schemesTable).values({
    title: title.trim(),
    description: description?.trim() ?? null,
    partyId: partyId ? Number(partyId) : null,
    dateAnnounced: dateAnnounced ?? null,
    manifestoPromise: manifestoPromise === true || manifestoPromise === "true",
    status: status ?? "announced",
    responseUrl: responseUrl?.trim() ?? null,
    newspaperUrl: newspaperUrl?.trim() ?? null,
    youtubeUrl: youtubeUrl?.trim() ?? null,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return res.status(201).json(scheme);
});

// PATCH /schemes/:id — admin only
router.patch("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, partyId, dateAnnounced, manifestoPromise, status, responseUrl, newspaperUrl, youtubeUrl } = req.body;
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { updatedAt: now };
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim() ?? null;
  if (partyId !== undefined) updateData.partyId = partyId ? Number(partyId) : null;
  if (dateAnnounced !== undefined) updateData.dateAnnounced = dateAnnounced ?? null;
  if (manifestoPromise !== undefined) updateData.manifestoPromise = manifestoPromise === true || manifestoPromise === "true";
  if (status !== undefined) updateData.status = status;
  if (responseUrl !== undefined) updateData.responseUrl = responseUrl?.trim() ?? null;
  if (newspaperUrl !== undefined) updateData.newspaperUrl = newspaperUrl?.trim() ?? null;
  if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl?.trim() ?? null;

  const [updated] = await db.update(schemesTable).set(updateData).where(eq(schemesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Scheme not found." });
  return res.json(updated);
});

// DELETE /schemes/:id — admin only
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(schemesTable).where(eq(schemesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Scheme not found." });
  return res.status(204).send();
});

export default router;
