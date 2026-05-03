import { Router } from "express";
import { db } from "@workspace/db";
import { issuesTable, issueActionsTable, partiesTable, politiciansTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

// GET /issues/matrix — all issues with party responses as columns
router.get("/matrix", async (_req, res) => {
  const [issues, parties, allActions] = await Promise.all([
    db.select().from(issuesTable).orderBy(desc(issuesTable.dateOccurred), desc(issuesTable.createdAt)),
    db.select().from(partiesTable).orderBy(partiesTable.id),
    db.select({
      id: issueActionsTable.id,
      issueId: issueActionsTable.issueId,
      partyId: issueActionsTable.partyId,
      politicianId: issueActionsTable.politicianId,
      actionType: issueActionsTable.actionType,
      description: issueActionsTable.description,
      sourceUrl: issueActionsTable.sourceUrl,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
      politicianName: politiciansTable.name,
    })
      .from(issueActionsTable)
      .leftJoin(partiesTable, eq(issueActionsTable.partyId, partiesTable.id))
      .leftJoin(politiciansTable, eq(issueActionsTable.politicianId, politiciansTable.id)),
  ]);

  const issuesWithResponses = issues.map((issue) => {
    const responses: Record<string, { actionType: string; description: string | null; politicianName: string | null; sourceUrl: string | null }[]> = {};
    for (const party of parties) {
      responses[party.shortName] = [];
    }
    for (const action of allActions) {
      if (action.issueId === issue.id && action.partyShortName) {
        if (!responses[action.partyShortName]) responses[action.partyShortName] = [];
        responses[action.partyShortName].push({
          actionType: action.actionType,
          description: action.description,
          politicianName: action.politicianName,
          sourceUrl: action.sourceUrl,
        });
      }
    }
    return { ...issue, responses };
  });

  return res.json({ parties, issues: issuesWithResponses });
});

// GET /issues
router.get("/", async (req, res) => {
  const { category } = req.query;
  const conditions = [];
  if (category && typeof category === "string") {
    conditions.push(eq(issuesTable.category, category as "death" | "protest" | "scheme" | "objection" | "disaster" | "controversy" | "newsletter" | "other"));
  }

  const issues = await db
    .select()
    .from(issuesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(issuesTable.createdAt));

  // Get action counts per issue
  const allActions = await db.select().from(issueActionsTable);
  const actionCounts: Record<number, number> = {};
  for (const a of allActions) {
    actionCounts[a.issueId] = (actionCounts[a.issueId] ?? 0) + 1;
  }

  return res.json(issues.map((issue) => ({ ...issue, actionCount: actionCounts[issue.id] ?? 0 })));
});

// GET /issues/:id — with all actions
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [issue] = await db.select().from(issuesTable).where(eq(issuesTable.id, id)).limit(1);
  if (!issue) return res.status(404).json({ error: "Issue not found." });

  const actions = await db
    .select({
      id: issueActionsTable.id,
      issueId: issueActionsTable.issueId,
      partyId: issueActionsTable.partyId,
      politicianId: issueActionsTable.politicianId,
      actionType: issueActionsTable.actionType,
      description: issueActionsTable.description,
      sourceUrl: issueActionsTable.sourceUrl,
      createdBy: issueActionsTable.createdBy,
      createdAt: issueActionsTable.createdAt,
      partyName: partiesTable.name,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
      politicianName: politiciansTable.name,
    })
    .from(issueActionsTable)
    .leftJoin(partiesTable, eq(issueActionsTable.partyId, partiesTable.id))
    .leftJoin(politiciansTable, eq(issueActionsTable.politicianId, politiciansTable.id))
    .where(eq(issueActionsTable.issueId, id))
    .orderBy(issueActionsTable.createdAt);

  return res.json({ ...issue, actions });
});

// POST /issues — open to all
router.post("/", async (req, res) => {
  const { title, description, category, dateOccurred, sourceUrl, location, createdBy } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  const [issue] = await db.insert(issuesTable).values({
    title: title.trim(),
    description: description?.trim() || null,
    category: category ?? "other",
    dateOccurred: dateOccurred || null,
    sourceUrl: sourceUrl?.trim() || null,
    location: location?.trim() || null,
    createdBy: createdBy?.trim() || null,
  }).returning();
  return res.status(201).json(issue);
});

// PUT /issues/:id — admin only
router.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, category, dateOccurred, sourceUrl, location } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  const [updated] = await db.update(issuesTable).set({
    title: title.trim(),
    description: description?.trim() || null,
    category: category ?? "other",
    dateOccurred: dateOccurred || null,
    sourceUrl: sourceUrl?.trim() || null,
    location: location?.trim() || null,
    updatedAt: new Date(),
  }).where(eq(issuesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Issue not found." });
  return res.json(updated);
});

// DELETE /issues/:id — admin only
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(issueActionsTable).where(eq(issueActionsTable.issueId, id));
  const [deleted] = await db.delete(issuesTable).where(eq(issuesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Issue not found." });
  return res.status(204).send();
});

// POST /issues/:id/actions — open to all
router.post("/:id/actions", async (req, res) => {
  const issueId = Number(req.params.id);
  const { partyId, politicianId, actionType, description, sourceUrl, createdBy } = req.body;
  if (!actionType) return res.status(400).json({ error: "Action type is required." });
  const [action] = await db.insert(issueActionsTable).values({
    issueId,
    partyId: partyId ? Number(partyId) : 0,
    politicianId: politicianId ? Number(politicianId) : 0,
    actionType,
    description: description?.trim() || null,
    sourceUrl: sourceUrl?.trim() || null,
    createdBy: createdBy?.trim() || null,
  }).returning();
  return res.status(201).json(action);
});

// DELETE /issues/:issueId/actions/:actionId — admin only
router.delete("/:issueId/actions/:actionId", requireAdmin, async (req, res) => {
  const actionId = Number(req.params.actionId);
  const [deleted] = await db.delete(issueActionsTable).where(eq(issueActionsTable.id, actionId)).returning();
  if (!deleted) return res.status(404).json({ error: "Action not found." });
  return res.status(204).send();
});

export default router;
