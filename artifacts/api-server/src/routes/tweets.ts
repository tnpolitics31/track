import { Router } from "express";
import { db } from "@workspace/db";
import { tweetsTable } from "@workspace/db";
import { eq, desc, ilike, and, gte, count, sql } from "drizzle-orm";
import {
  CreateTweetBody,
  ListTweetsQueryParams,
  GetTweetParams,
  DeleteTweetParams,
  RefreshTweetParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

function normalizeTweetUrl(url: string): string {
  return url.replace(/[?#].*$/, "").replace(/\/$/, "");
}

async function fetchTweetMetadata(url: string): Promise<{
  authorHandle: string | null;
  authorName: string | null;
  content: string | null;
  type: "text" | "image" | "mixed" | "unknown";
}> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return { authorHandle: null, authorName: null, content: null, type: "unknown" };
    }
    const data = await res.json() as { author_name?: string; author_url?: string; html?: string };

    const authorName = data.author_name ?? null;
    const authorUrl = data.author_url ?? "";
    const handleMatch = authorUrl.match(/twitter\.com\/([^/]+)$/) || authorUrl.match(/x\.com\/([^/]+)$/);
    const authorHandle = handleMatch ? handleMatch[1] : null;

    const html = data.html ?? "";

    // Strip HTML tags to get text content
    const textContent = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    // Detect type based on HTML content
    const hasImage = /pic\.twitter\.com|pbs\.twimg\.com|twitter\.com\/[^/]+\/status\/\d+\/photo|video\.twimg\.com/i.test(html);
    const hasVideo = /video\.twimg\.com|youtube\.com|youtu\.be/i.test(html);

    let type: "text" | "image" | "mixed" | "unknown" = "text";
    if (hasImage && hasVideo) {
      type = "mixed";
    } else if (hasImage) {
      type = "image";
    } else if (hasVideo) {
      type = "mixed";
    } else {
      // Try microlink for more accurate detection
      try {
        const microlinkRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (microlinkRes.ok) {
          const microlinkData = await microlinkRes.json() as { data?: { image?: unknown; video?: unknown } };
          const hasMLImage = !!microlinkData?.data?.image;
          const hasMLVideo = !!microlinkData?.data?.video;
          if (hasMLImage && hasMLVideo) type = "mixed";
          else if (hasMLVideo) type = "mixed";
          else if (hasMLImage) type = "image";
          else type = "text";
        }
      } catch {
        type = "text";
      }
    }

    return { authorHandle, authorName, content: textContent, type };
  } catch {
    return { authorHandle: null, authorName: null, content: null, type: "unknown" };
  }
}

async function captureScreenshot(url: string): Promise<string | null> {
  try {
    const screenshotApiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
    const res = await fetch(screenshotApiUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const data = await res.json() as { screenshot?: { url?: string } };
    return data?.screenshot?.url ?? null;
  } catch {
    return null;
  }
}

// GET /tweets
router.get("/", async (req, res) => {
  const parse = ListTweetsQueryParams.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }
  const { type, search } = parse.data;

  const conditions = [];
  if (type) conditions.push(eq(tweetsTable.type, type));
  if (search) conditions.push(ilike(tweetsTable.content, `%${search}%`));

  const tweets = await db
    .select()
    .from(tweetsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tweetsTable.createdAt));

  return res.json(tweets);
});

// POST /tweets
router.post("/", async (req, res) => {
  const parse = CreateTweetBody.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { url, notes, tags } = parse.data;
  const normalizedUrl = normalizeTweetUrl(url.trim());
  const tweetId = extractTweetId(normalizedUrl);

  if (!tweetId) {
    return res.status(400).json({ error: "Invalid Twitter/X URL. Please paste a valid tweet link." });
  }

  // Check for duplicate
  const existing = await db.select().from(tweetsTable).where(eq(tweetsTable.url, normalizedUrl)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "This tweet is already being tracked." });
  }

  // Fetch metadata and screenshot in parallel
  const [metadata, screenshotUrl] = await Promise.all([
    fetchTweetMetadata(normalizedUrl),
    captureScreenshot(normalizedUrl),
  ]);

  const [tweet] = await db
    .insert(tweetsTable)
    .values({
      url: normalizedUrl,
      tweetId,
      authorHandle: metadata.authorHandle,
      authorName: metadata.authorName,
      content: metadata.content,
      type: metadata.type,
      screenshotUrl,
      notes: notes ?? null,
      tags: tags ?? null,
    })
    .returning();

  return res.status(201).json(tweet);
});

// GET /tweets/stats
router.get("/stats", async (req, res) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalRes, typeRes, screenshotRes, recentRes] = await Promise.all([
    db.select({ count: count() }).from(tweetsTable),
    db.select({ type: tweetsTable.type, count: count() }).from(tweetsTable).groupBy(tweetsTable.type),
    db.select({ count: count() }).from(tweetsTable).where(sql`${tweetsTable.screenshotUrl} IS NOT NULL`),
    db.select({ count: count() }).from(tweetsTable).where(gte(tweetsTable.createdAt, oneDayAgo)),
  ]);

  const total = totalRes[0]?.count ?? 0;
  const withScreenshots = screenshotRes[0]?.count ?? 0;
  const recentlyAdded = recentRes[0]?.count ?? 0;

  const typeCounts = { text: 0, image: 0, mixed: 0 };
  for (const row of typeRes) {
    if (row.type === "text") typeCounts.text = row.count;
    else if (row.type === "image") typeCounts.image = row.count;
    else if (row.type === "mixed") typeCounts.mixed = row.count;
  }

  return res.json({
    total,
    textOnly: typeCounts.text,
    imageBased: typeCounts.image,
    mixed: typeCounts.mixed,
    withScreenshots,
    recentlyAdded,
  });
});

// GET /tweets/gallery
router.get("/gallery", async (req, res) => {
  const tweets = await db
    .select()
    .from(tweetsTable)
    .orderBy(desc(tweetsTable.createdAt));

  return res.json(tweets);
});

// POST /tweets/admin-check — verify admin password (must be before /:id routes)
router.post("/admin-check", requireAdmin, (_req, res) => {
  return res.json({ ok: true });
});

// GET /tweets/:id
router.get("/:id", async (req, res) => {
  const parse = GetTweetParams.safeParse({ id: Number(req.params.id) });
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid tweet ID" });
  }

  const [tweet] = await db.select().from(tweetsTable).where(eq(tweetsTable.id, parse.data.id)).limit(1);
  if (!tweet) {
    return res.status(404).json({ error: "Tweet not found" });
  }

  return res.json(tweet);
});

// DELETE /tweets/:id — admin only
router.delete("/:id", requireAdmin, async (req, res) => {
  const parse = DeleteTweetParams.safeParse({ id: Number(req.params.id) });
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid tweet ID" });
  }

  const [deleted] = await db.delete(tweetsTable).where(eq(tweetsTable.id, parse.data.id)).returning();
  if (!deleted) {
    return res.status(404).json({ error: "Tweet not found" });
  }

  return res.status(204).send();
});

// POST /tweets/:id/refresh
router.post("/:id/refresh", async (req, res) => {
  const parse = RefreshTweetParams.safeParse({ id: Number(req.params.id) });
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid tweet ID" });
  }

  const [existing] = await db.select().from(tweetsTable).where(eq(tweetsTable.id, parse.data.id)).limit(1);
  if (!existing) {
    return res.status(404).json({ error: "Tweet not found" });
  }

  const [metadata, screenshotUrl] = await Promise.all([
    fetchTweetMetadata(existing.url),
    captureScreenshot(existing.url),
  ]);

  const [updated] = await db
    .update(tweetsTable)
    .set({
      authorHandle: metadata.authorHandle ?? existing.authorHandle,
      authorName: metadata.authorName ?? existing.authorName,
      content: metadata.content ?? existing.content,
      type: metadata.type !== "unknown" ? metadata.type : existing.type,
      screenshotUrl: screenshotUrl ?? existing.screenshotUrl,
      updatedAt: new Date(),
    })
    .where(eq(tweetsTable.id, parse.data.id))
    .returning();

  return res.json(updated);
});

export default router;
