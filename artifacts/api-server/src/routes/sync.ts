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

function detectSentiment(text: string): "positive" | "negative" | "neutral" | "attack" | "promise" {
  const t = text.toLowerCase();
  const attackWords = ["condemned", "accused", "attack", "slammed", "criticized", "against", "oppose", "failure", "corrupt", "scam", "fake", "lies", "lied", "betrayed", "shame", "ஆட்சேபிக்", "கண்டன", "குற்றம்"];
  const promiseWords = ["will", "shall", "announce", "scheme", "inaugurat", "launch", "launch", "crore", "rs.", "₹", "benefit", "provide", "ensure", "commit", "plan", "நிதி", "திட்டம்", "அறிவிக்"];
  const positiveWords = ["congratulate", "thank", "welcome", "support", "success", "achieve", "develop", "proud", "happy", "celebrate", "நன்றி", "வாழ்த்து", "வெற்றி"];
  const negativeWords = ["death", "tragedy", "flood", "drought", "crisis", "accident", "fire", "disaster", "victim", "மரண", "பேரழிவு", "வெள்ளம்"];

  if (attackWords.some((w) => t.includes(w))) return "attack";
  if (promiseWords.some((w) => t.includes(w))) return "promise";
  if (negativeWords.some((w) => t.includes(w))) return "negative";
  if (positiveWords.some((w) => t.includes(w))) return "positive";
  return "neutral";
}

function getScraperClient() {
  const authToken = process.env.TWITTER_AUTH_TOKEN;
  const ct0 = process.env.TWITTER_CT0;
  if (!authToken) throw new Error("TWITTER_AUTH_TOKEN secret is not set.");
  return { authToken, ct0 };
}

async function syncHandle(
  handle: string,
  resolvedPoliticianId: number | null,
  resolvedPartyId: number | null,
  maxCount: number,
  scraper: { getTweets: (handle: string, count: number) => AsyncIterable<{ permanentUrl?: string; id?: string; photos?: unknown[]; videos?: unknown[]; username?: string; name?: string; text?: string; timeParsed?: Date }> },
): Promise<{ added: number; skipped: number; errors: string[] }> {
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for await (const tweet of scraper.getTweets(handle, maxCount)) {
    if (!tweet.permanentUrl || !tweet.id) continue;

    const tweetUrl = normalizeTweetUrl(tweet.permanentUrl.replace("twitter.com", "x.com"));
    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) continue;

    const existing = await db.select({ id: tweetsTable.id })
      .from(tweetsTable).where(eq(tweetsTable.url, tweetUrl)).limit(1);
    if (existing.length > 0) { skipped++; continue; }

    const hasPhotos = Array.isArray(tweet.photos) && tweet.photos.length > 0;
    const hasVideos = Array.isArray(tweet.videos) && tweet.videos.length > 0;
    let type: "text" | "image" | "mixed" = "text";
    if (hasPhotos && hasVideos) type = "mixed";
    else if (hasVideos) type = "mixed";
    else if (hasPhotos) type = "image";

    const content = tweet.text ?? null;
    const sentiment = content ? detectSentiment(content) : "neutral";
    const createdAt = tweet.timeParsed ? tweet.timeParsed.toISOString() : new Date().toISOString();

    try {
      await db.insert(tweetsTable).values({
        url: tweetUrl,
        tweetId,
        authorHandle: tweet.username ?? handle,
        authorName: tweet.name ?? null,
        content,
        type,
        sentiment,
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

  return { added, skipped, errors };
}

// POST /sync/tweets  — fetch latest tweets for one handle
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

  const { Scraper } = await import("@the-convocation/twitter-scraper");
  const scraper = new Scraper();

  const cookieStrings = [
    `auth_token=${credentials.authToken}; domain=.twitter.com; path=/`,
    `auth_token=${credentials.authToken}; domain=.x.com; path=/`,
  ];
  if (credentials.ct0) {
    cookieStrings.push(`ct0=${credentials.ct0}; domain=.twitter.com; path=/`);
    cookieStrings.push(`ct0=${credentials.ct0}; domain=.x.com; path=/`);
  }
  await scraper.setCookies(cookieStrings);

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

  try {
    const result = await syncHandle(handle, resolvedPoliticianId, resolvedPartyId, maxCount, scraper);
    return res.json(result);
  } catch (e: unknown) {
    return res.status(502).json({ error: `Failed to fetch tweets: ${(e as Error).message}` });
  }
});

// POST /sync/all — bulk sync all politicians that have a twitter handle
router.post("/all", async (req, res) => {
  const { count = 20 } = req.body as { count?: number };

  let credentials: { authToken: string; ct0?: string };
  try {
    credentials = getScraperClient();
  } catch (e: unknown) {
    return res.status(503).json({ error: (e as Error).message });
  }

  const politicians = await db
    .select({
      id: politiciansTable.id,
      name: politiciansTable.name,
      twitterHandle: politiciansTable.twitterHandle,
      partyId: politiciansTable.partyId,
    })
    .from(politiciansTable)
    .where(like(politiciansTable.twitterHandle, "_%"));

  if (politicians.length === 0) {
    return res.json({ results: [], totalAdded: 0, totalSkipped: 0 });
  }

  const { Scraper } = await import("@the-convocation/twitter-scraper");
  const scraper = new Scraper();

  const cookieStrings = [
    `auth_token=${credentials.authToken}; domain=.twitter.com; path=/`,
    `auth_token=${credentials.authToken}; domain=.x.com; path=/`,
  ];
  if (credentials.ct0) {
    cookieStrings.push(`ct0=${credentials.ct0}; domain=.twitter.com; path=/`);
    cookieStrings.push(`ct0=${credentials.ct0}; domain=.x.com; path=/`);
  }
  await scraper.setCookies(cookieStrings);

  const maxCount = Math.min(Number(count) || 20, 30);
  const results: { name: string; handle: string; added: number; skipped: number; error?: string }[] = [];
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const pol of politicians) {
    if (!pol.twitterHandle) continue;
    try {
      const r = await syncHandle(pol.twitterHandle, pol.id, pol.partyId, maxCount, scraper);
      results.push({ name: pol.name, handle: pol.twitterHandle, added: r.added, skipped: r.skipped });
      totalAdded += r.added;
      totalSkipped += r.skipped;
    } catch (e: unknown) {
      results.push({ name: pol.name, handle: pol.twitterHandle, added: 0, skipped: 0, error: (e as Error).message });
    }
  }

  return res.json({ results, totalAdded, totalSkipped });
});

// GET /sync/politicians — list politicians with a twitter handle (for UI dropdown)
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
    .where(like(politiciansTable.twitterHandle, "_%"));

  return res.json(rows);
});

export default router;
