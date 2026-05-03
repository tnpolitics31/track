import { Router } from "express";
import { db } from "@workspace/db";
import { pendingTweetsTable, tweetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /pending — list all pending tweets (admin)
router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(pendingTweetsTable)
    .orderBy(pendingTweetsTable.createdAt);
  return res.json(rows);
});

// GET /pending/count — just the pending count (for badge)
router.get("/count", async (_req, res) => {
  const rows = await db
    .select({ id: pendingTweetsTable.id })
    .from(pendingTweetsTable)
    .where(eq(pendingTweetsTable.status, "pending"));
  return res.json({ count: rows.length });
});

// POST /pending/:id/approve — approve: move to tweets table
router.post("/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const [pending] = await db
    .select()
    .from(pendingTweetsTable)
    .where(eq(pendingTweetsTable.id, id))
    .limit(1);

  if (!pending) return res.status(404).json({ error: "Not found" });

  const existing = await db
    .select({ id: tweetsTable.id })
    .from(tweetsTable)
    .where(eq(tweetsTable.url, pending.url))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(tweetsTable).values({
      url: pending.url,
      tweetId: pending.tweetId,
      authorHandle: pending.authorHandle,
      authorName: pending.authorName,
      content: pending.content,
      type: pending.type,
      sentiment: pending.sentiment,
      screenshotUrl: null,
      notes: `Community submission by @${pending.submittedByHandle ?? "unknown"}`,
      tags: "community",
      partyId: pending.partyId,
      politicianId: pending.politicianId,
      eventId: null,
      createdAt: pending.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  await db
    .update(pendingTweetsTable)
    .set({ status: "approved" })
    .where(eq(pendingTweetsTable.id, id));

  return res.json({ ok: true });
});

// POST /pending/:id/reject
router.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  await db
    .update(pendingTweetsTable)
    .set({ status: "rejected" })
    .where(eq(pendingTweetsTable.id, id));

  return res.json({ ok: true });
});

// POST /pending/:id/revoke — set rejected back to pending
router.post("/:id/revoke", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  await db
    .update(pendingTweetsTable)
    .set({ status: "pending" })
    .where(eq(pendingTweetsTable.id, id));
  return res.json({ ok: true });
});

// DELETE /pending/:id — hard delete
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  await db.delete(pendingTweetsTable).where(eq(pendingTweetsTable.id, id));
  return res.json({ ok: true });
});

// POST /pending/bulk — bulk approve / reject / delete
router.post("/bulk", async (req, res) => {
  const { ids, action } = req.body as { ids?: number[]; action?: string };
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
  if (!["approve", "reject", "delete"].includes(action ?? "")) return res.status(400).json({ error: "action must be approve, reject, or delete" });

  let done = 0;

  if (action === "delete") {
    for (const id of ids) {
      await db.delete(pendingTweetsTable).where(eq(pendingTweetsTable.id, id));
      done++;
    }
    return res.json({ ok: true, done });
  }

  if (action === "reject") {
    for (const id of ids) {
      await db.update(pendingTweetsTable).set({ status: "rejected" }).where(eq(pendingTweetsTable.id, id));
      done++;
    }
    return res.json({ ok: true, done });
  }

  // approve — move each to tweets table
  for (const id of ids) {
    const [pending] = await db.select().from(pendingTweetsTable).where(eq(pendingTweetsTable.id, id)).limit(1);
    if (!pending) continue;
    const existing = await db.select({ id: tweetsTable.id }).from(tweetsTable).where(eq(tweetsTable.url, pending.url)).limit(1);
    if (existing.length === 0) {
      await db.insert(tweetsTable).values({
        url: pending.url,
        tweetId: pending.tweetId,
        authorHandle: pending.authorHandle,
        authorName: pending.authorName,
        content: pending.content,
        type: pending.type,
        sentiment: pending.sentiment,
        screenshotUrl: null,
        notes: `Community submission by @${pending.submittedByHandle ?? "unknown"}`,
        tags: "community",
        partyId: pending.partyId,
        politicianId: pending.politicianId,
        eventId: null,
        createdAt: pending.createdAt,
        updatedAt: new Date().toISOString(),
      });
    }
    await db.update(pendingTweetsTable).set({ status: "approved" }).where(eq(pendingTweetsTable.id, id));
    done++;
  }

  return res.json({ ok: true, done });
});

export default router;
