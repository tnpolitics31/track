import { Router } from "express";
import { db } from "@workspace/db";
import { tweetsTable, partiesTable, politiciansTable, eventsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { ensureDefaultParties } from "./parties";

const router = Router();

// GET /dashboard/stats
router.get("/stats", async (_req, res) => {
  await ensureDefaultParties();

  const [parties, politicians, events, totalTweets] = await Promise.all([
    db.select().from(partiesTable).orderBy(partiesTable.id),
    db.select().from(politiciansTable),
    db.select().from(eventsTable),
    db.select({ count: count() }).from(tweetsTable),
  ]);

  const tweetsByParty = await db
    .select({ partyId: tweetsTable.partyId, count: count() })
    .from(tweetsTable)
    .where(sql`${tweetsTable.partyId} is not null`)
    .groupBy(tweetsTable.partyId);

  const politiciansByParty = politicians.reduce((acc, p) => {
    if (p.partyId) acc[p.partyId] = (acc[p.partyId] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const tweetCountByParty = tweetsByParty.reduce((acc, row) => {
    if (row.partyId) acc[row.partyId] = row.count;
    return acc;
  }, {} as Record<number, number>);

  const partyStats = parties.map((p) => ({
    ...p,
    tweetCount: tweetCountByParty[p.id] ?? 0,
    politicianCount: politiciansByParty[p.id] ?? 0,
  }));

  const topPoliticians = await db
    .select({
      id: politiciansTable.id,
      name: politiciansTable.name,
      twitterHandle: politiciansTable.twitterHandle,
      constituency: politiciansTable.constituency,
      role: politiciansTable.role,
      partyId: politiciansTable.partyId,
      partyName: partiesTable.name,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
      tweetCount: count(tweetsTable.id),
    })
    .from(politiciansTable)
    .leftJoin(partiesTable, eq(politiciansTable.partyId, partiesTable.id))
    .leftJoin(tweetsTable, eq(tweetsTable.politicianId, politiciansTable.id))
    .groupBy(politiciansTable.id, partiesTable.id)
    .orderBy(desc(count(tweetsTable.id)))
    .limit(8);

  const recentTweets = await db
    .select({
      id: tweetsTable.id,
      url: tweetsTable.url,
      authorName: tweetsTable.authorName,
      authorHandle: tweetsTable.authorHandle,
      content: tweetsTable.content,
      type: tweetsTable.type,
      screenshotUrl: tweetsTable.screenshotUrl,
      createdAt: tweetsTable.createdAt,
      partyId: tweetsTable.partyId,
      partyName: partiesTable.name,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
    })
    .from(tweetsTable)
    .leftJoin(partiesTable, eq(tweetsTable.partyId, partiesTable.id))
    .orderBy(desc(tweetsTable.createdAt))
    .limit(6);

  return res.json({
    totalTweets: totalTweets[0]?.count ?? 0,
    totalPoliticians: politicians.length,
    totalEvents: events.length,
    partyStats,
    topPoliticians,
    recentTweets,
  });
});

export default router;
