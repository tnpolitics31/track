import { Router } from "express";
import { db } from "@workspace/db";
import { tweetsTable, politiciansTable, partiesTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const router = Router();

function normalizeTweetUrl(url: string): string {
  return url.replace(/[?#].*$/, "").replace(/\/$/, "");
}

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

function getScraperClient() {
  const authToken = process.env.TWITTER_AUTH_TOKEN;
  const ct0 = process.env.TWITTER_CT0;
  if (!authToken) throw new Error("TWITTER_AUTH_TOKEN secret is not set.");
  return { authToken, ct0 };
}

// POST /sync/tweets  — fetch latest tweets for a politician's handle and bulk-insert new ones
router.post("/tweets", async (req, res) => {
  const { handle, politicianId, count = 20 } = req.body as {
    handle?: string;
    politicianId?: number;
    count?: number;
  };

  if (!handle) return res.status(400).json({ error: "handle is required" });

  let credentials: { authToken: string; ct0?: string };
  try {
    credentials = getScraperClient();
  } catch (e: unknown) {
    return res.status(503).json({ error: (e as Error).message });
  }

  // Dynamically import scraper (heavy, avoids startup cost)
  const { Scraper } = await import("@the-convocation/twitter-scraper");
  const scraper = new Scraper();

  // Build cookie string for auth
  const cookieStrings = [
    `auth_token=${credentials.authToken}; domain=.twitter.com; path=/`,
    `auth_token=${credentials.authToken}; domain=.x.com; path=/`,
  ];
  if (credentials.ct0) {
    cookieStrings.push(`ct0=${credentials.ct0}; domain=.twitter.com; path=/`);
    cookieStrings.push(`ct0=${credentials.ct0}; domain=.x.com; path=/`);
  }
  await scraper.setCookies(cookieStrings);

  // Resolve politician & party if not given
  let resolvedPoliticianId = politicianId ?? null;
  let resolvedPartyId: number | null = null;
  if (resolvedPoliticianId) {
    const [pol] = await db.select().from(politiciansTable).where(eq(politiciansTable.id, resolvedPoliticianId)).limit(1);
    if (pol?.partyId) resolvedPartyId = pol.partyId;
  } else {
    const [matched] = await db.select().from(politiciansTable)
      .where(like(politiciansTable.twitterHandle, handle)).limit(1);
    if (matched) {
      resolvedPoliticianId = matched.id;
      if (matched.partyId) resolvedPartyId = matched.partyId;
    }
  }

  const maxCount = Math.min(Number(count) || 20, 50);
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for await (const tweet of scraper.getTweets(handle, maxCount)) {
      if (!tweet.permanentUrl || !tweet.id) continue;

      const tweetUrl = normalizeTweetUrl(tweet.permanentUrl.replace("twitter.com", "x.com"));
      const tweetId = extractTweetId(tweetUrl);
      if (!tweetId) continue;

      // Skip if already tracked
      const existing = await db.select({ id: tweetsTable.id })
        .from(tweetsTable).where(eq(tweetsTable.url, tweetUrl)).limit(1);
      if (existing.length > 0) { skipped++; continue; }

      // Determine type from media
      const hasPhotos = Array.isArray(tweet.photos) && tweet.photos.length > 0;
      const hasVideos = Array.isArray(tweet.videos) && tweet.videos.length > 0;
      let type: "text" | "image" | "mixed" = "text";
      if (hasPhotos && hasVideos) type = "mixed";
      else if (hasVideos) type = "mixed";
      else if (hasPhotos) type = "image";

      const authorHandle = tweet.username ?? handle;
      const authorName = tweet.name ?? null;
      const content = tweet.text ?? null;
      const createdAt = tweet.timeParsed ? tweet.timeParsed.toISOString() : new Date().toISOString();

      try {
        await db.insert(tweetsTable).values({
          url: tweetUrl,
          tweetId,
          authorHandle,
          authorName,
          content,
          type,
          screenshotUrl: null,
          notes: null,
          tags: null,
          partyId: resolvedPartyId,
          politicianId: resolvedPoliticianId,
          eventId: null,
          createdAt,
          updatedAt: new Date().toISOString(),
        });
        added++;
      } catch {
        errors.push(tweetId);
      }
    }
  } catch (e: unknown) {
    return res.status(502).json({
      error: `Failed to fetch tweets: ${(e as Error).message}`,
      added,
      skipped,
    });
  }

  return res.json({ added, skipped, errors: errors.length > 0 ? errors : undefined });
});

// GET /sync/politicians — list politicians that have a twitter handle (for UI dropdown)
router.get("/politicians", async (_req, res) => {
  const rows = await db
    .select({
      id: politiciansTable.id,
      name: politiciansTable.name,
      twitterHandle: politiciansTable.twitterHandle,
      partyShortName: partiesTable.shortName,
      partyColor: partiesTable.color,
    })
    .from(politiciansTable)
    .leftJoin(partiesTable, eq(politiciansTable.partyId, partiesTable.id))
    .where(like(politiciansTable.twitterHandle, "_%")); // has a handle

  return res.json(rows);
});

export default router;
