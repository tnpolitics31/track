import { Router } from "express";
import { db } from "@workspace/db";
import { tweetVotesTable, tweetsTable } from "@workspace/db";
import { eq, and, desc, sql, gte } from "drizzle-orm";

const router = Router();

// GET /api/votes?tweetIds=1,2,3&fingerprint=xxx
// Returns vote counts and the caller's vote for each tweetId
router.get("/", async (req, res) => {
  const { tweetIds, fingerprint } = req.query;
  if (!tweetIds || typeof tweetIds !== "string") {
    return res.status(400).json({ error: "tweetIds is required" });
  }
  const ids = tweetIds
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => !isNaN(n) && n > 0);
  if (ids.length === 0) return res.json({});

  const allVotes = await db
    .select()
    .from(tweetVotesTable)
    .where(
      sql`${tweetVotesTable.tweetId} IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

  const result: Record<
    number,
    { likes: number; dislikes: number; userVote: "like" | "dislike" | null }
  > = {};
  for (const id of ids) {
    result[id] = { likes: 0, dislikes: 0, userVote: null };
  }
  for (const vote of allVotes) {
    if (!result[vote.tweetId]) continue;
    if (vote.voteType === "like") result[vote.tweetId].likes++;
    else result[vote.tweetId].dislikes++;
    if (fingerprint && vote.fingerprint === String(fingerprint)) {
      result[vote.tweetId].userVote = vote.voteType as "like" | "dislike";
    }
  }
  return res.json(result);
});

// GET /api/votes/best-week — top liked tweet in last 7 days
router.get("/best-week", async (_req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await db
    .select({
      tweetId: tweetVotesTable.tweetId,
      likes: sql<number>`SUM(CASE WHEN ${tweetVotesTable.voteType} = 'like' THEN 1 ELSE 0 END)`,
      dislikes: sql<number>`SUM(CASE WHEN ${tweetVotesTable.voteType} = 'dislike' THEN 1 ELSE 0 END)`,
    })
    .from(tweetVotesTable)
    .where(gte(tweetVotesTable.createdAt, since))
    .groupBy(tweetVotesTable.tweetId)
    .orderBy(
      desc(
        sql`SUM(CASE WHEN ${tweetVotesTable.voteType} = 'like' THEN 1 ELSE 0 END)`
      )
    )
    .limit(10);

  if (rows.length === 0) return res.json({ tweet: null, leaderboard: [] });

  const tweetIds = rows.map((r) => r.tweetId);
  const tweets = await db
    .select()
    .from(tweetsTable)
    .where(
      sql`${tweetsTable.id} IN (${sql.join(
        tweetIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

  const tweetMap = Object.fromEntries(tweets.map((t) => [t.id, t]));
  const leaderboard = rows
    .map((r) => ({
      tweet: tweetMap[r.tweetId] ?? null,
      likes: Number(r.likes),
      dislikes: Number(r.dislikes),
      score: Number(r.likes) - Number(r.dislikes),
    }))
    .filter((r) => r.tweet);

  return res.json({
    tweet: leaderboard[0]?.tweet ?? null,
    likes: leaderboard[0]?.likes ?? 0,
    dislikes: leaderboard[0]?.dislikes ?? 0,
    leaderboard,
  });
});

// GET /api/votes/all-time — all-time top 10 tweets by net score
router.get("/all-time", async (_req, res) => {
  const rows = await db
    .select({
      tweetId: tweetVotesTable.tweetId,
      likes: sql<number>`SUM(CASE WHEN ${tweetVotesTable.voteType} = 'like' THEN 1 ELSE 0 END)`,
      dislikes: sql<number>`SUM(CASE WHEN ${tweetVotesTable.voteType} = 'dislike' THEN 1 ELSE 0 END)`,
    })
    .from(tweetVotesTable)
    .groupBy(tweetVotesTable.tweetId)
    .orderBy(
      desc(
        sql`SUM(CASE WHEN ${tweetVotesTable.voteType} = 'like' THEN 1 ELSE 0 END)`
      )
    )
    .limit(10);

  if (rows.length === 0) return res.json([]);

  const tweetIds = rows.map((r) => r.tweetId);
  const tweets = await db
    .select()
    .from(tweetsTable)
    .where(
      sql`${tweetsTable.id} IN (${sql.join(
        tweetIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

  const tweetMap = Object.fromEntries(tweets.map((t) => [t.id, t]));
  return res.json(
    rows
      .map((r) => ({
        tweet: tweetMap[r.tweetId] ?? null,
        likes: Number(r.likes),
        dislikes: Number(r.dislikes),
        score: Number(r.likes) - Number(r.dislikes),
      }))
      .filter((r) => r.tweet)
  );
});

// POST /api/votes { tweetId, voteType, fingerprint }
// Casts or toggles a vote (same vote = remove; opposite = switch)
router.post("/", async (req, res) => {
  const { tweetId, voteType, fingerprint } = req.body as {
    tweetId: number;
    voteType: "like" | "dislike";
    fingerprint: string;
  };
  if (!tweetId || !voteType || !fingerprint) {
    return res.status(400).json({ error: "tweetId, voteType, fingerprint are required" });
  }
  if (!["like", "dislike"].includes(voteType)) {
    return res.status(400).json({ error: "voteType must be like or dislike" });
  }

  // Check tweet exists
  const [tweet] = await db
    .select({ id: tweetsTable.id })
    .from(tweetsTable)
    .where(eq(tweetsTable.id, Number(tweetId)))
    .limit(1);
  if (!tweet) return res.status(404).json({ error: "Tweet not found" });

  // Find existing vote
  const [existing] = await db
    .select()
    .from(tweetVotesTable)
    .where(
      and(
        eq(tweetVotesTable.tweetId, Number(tweetId)),
        eq(tweetVotesTable.fingerprint, fingerprint)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.voteType === voteType) {
      // Same vote → toggle off
      await db.delete(tweetVotesTable).where(eq(tweetVotesTable.id, existing.id));
      return res.json({ action: "removed", voteType: null });
    } else {
      // Different vote → switch
      await db
        .update(tweetVotesTable)
        .set({ voteType, createdAt: new Date().toISOString() })
        .where(eq(tweetVotesTable.id, existing.id));
      return res.json({ action: "switched", voteType });
    }
  }

  await db.insert(tweetVotesTable).values({
    tweetId: Number(tweetId),
    voteType,
    fingerprint,
    createdAt: new Date().toISOString(),
  });
  return res.status(201).json({ action: "added", voteType });
});

export default router;
