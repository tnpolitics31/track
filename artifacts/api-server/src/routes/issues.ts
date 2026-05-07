import { Router } from "express";
import { db } from "@workspace/db";
import { issuesTable, issueActionsTable, partiesTable, politiciansTable, tweetIssueLinksTable, tweetsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
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
    for (const party of parties) responses[party.shortName] = [];
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
  const { category, status } = req.query;
  const conditions = [];
  if (category && typeof category === "string") {
    conditions.push(eq(issuesTable.category, category as "death" | "protest" | "scheme" | "objection" | "disaster" | "controversy" | "newsletter" | "other"));
  }
  if (status && typeof status === "string") {
    conditions.push(eq(issuesTable.status, status as "open" | "in_progress" | "resolved"));
  }

  const issues = await db
    .select()
    .from(issuesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(issuesTable.createdAt));

  const allActions = await db.select().from(issueActionsTable);
  const actionCounts: Record<number, number> = {};
  for (const a of allActions) actionCounts[a.issueId] = (actionCounts[a.issueId] ?? 0) + 1;

  return res.json(issues.map((issue) => ({ ...issue, actionCount: actionCounts[issue.id] ?? 0 })));
});

// GET /issues/:id — with all actions and linked tweets
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

  // Get linked tweets
  const links = await db.select().from(tweetIssueLinksTable).where(eq(tweetIssueLinksTable.issueId, id));
  let linkedTweets: unknown[] = [];
  if (links.length > 0) {
    const tweetIds = links.map((l) => l.tweetId);
    linkedTweets = await db
      .select({
        id: tweetsTable.id,
        url: tweetsTable.url,
        authorName: tweetsTable.authorName,
        authorHandle: tweetsTable.authorHandle,
        content: tweetsTable.content,
        type: tweetsTable.type,
        sentiment: tweetsTable.sentiment,
        partyName: partiesTable.name,
        partyShortName: partiesTable.shortName,
        partyColor: partiesTable.color,
        createdAt: tweetsTable.createdAt,
      })
      .from(tweetsTable)
      .leftJoin(partiesTable, eq(tweetsTable.partyId, partiesTable.id))
      .where(inArray(tweetsTable.id, tweetIds));
  }

  return res.json({ ...issue, actions, linkedTweets });
});

// POST /issues — open to all
router.post("/", async (req, res) => {
  const { title, description, category, dateOccurred, sourceUrl, location, createdBy } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  const [issue] = await db.insert(issuesTable).values({
    title: title.trim(),
    description: description?.trim() || null,
    category: category ?? "other",
    status: "open",
    dateOccurred: dateOccurred || null,
    sourceUrl: sourceUrl?.trim() || null,
    location: location?.trim() || null,
    createdBy: createdBy?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
  }).where(eq(issuesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Issue not found." });
  return res.json(updated);
});

// PATCH /issues/:id/status — admin only
router.patch("/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["open", "in_progress", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be open, in_progress, or resolved." });
  }
  const [updated] = await db.update(issuesTable).set({
    status: status as "open" | "in_progress" | "resolved",
    updatedAt: new Date().toISOString(),
  }).where(eq(issuesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Issue not found." });
  return res.json(updated);
});

// DELETE /issues/:id — admin only
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(issueActionsTable).where(eq(issueActionsTable.issueId, id));
  await db.delete(tweetIssueLinksTable).where(eq(tweetIssueLinksTable.issueId, id));
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
    partyId: partyId ? Number(partyId) : null,
    politicianId: politicianId ? Number(politicianId) : null,
    actionType,
    description: description?.trim() || null,
    sourceUrl: sourceUrl?.trim() || null,
    createdBy: createdBy?.trim() || null,
    createdAt: new Date().toISOString(),
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

// POST /issues/:id/tweet-links — link a tweet to an issue
router.post("/:id/tweet-links", requireAdmin, async (req, res) => {
  const issueId = Number(req.params.id);
  const { tweetId } = req.body;
  if (!tweetId) return res.status(400).json({ error: "tweetId is required." });

  // Check tweet exists
  const [tweet] = await db.select().from(tweetsTable).where(eq(tweetsTable.id, Number(tweetId))).limit(1);
  if (!tweet) return res.status(404).json({ error: "Tweet not found." });

  // Check for duplicate
  const [existing] = await db.select().from(tweetIssueLinksTable)
    .where(and(eq(tweetIssueLinksTable.issueId, issueId), eq(tweetIssueLinksTable.tweetId, Number(tweetId)))).limit(1);
  if (existing) return res.status(409).json({ error: "Already linked." });

  const [link] = await db.insert(tweetIssueLinksTable).values({
    tweetId: Number(tweetId),
    issueId,
    createdAt: new Date().toISOString(),
  }).returning();
  return res.status(201).json(link);
});

// DELETE /issues/:id/tweet-links/:tweetId — unlink tweet
router.delete("/:id/tweet-links/:tweetId", requireAdmin, async (req, res) => {
  const issueId = Number(req.params.id);
  const tweetId = Number(req.params.tweetId);
  await db.delete(tweetIssueLinksTable)
    .where(and(eq(tweetIssueLinksTable.issueId, issueId), eq(tweetIssueLinksTable.tweetId, tweetId)));
  return res.status(204).send();
});

export default router;
