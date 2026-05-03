import { Router } from "express";
import { db } from "@workspace/db";
import { tweetsTable, politiciansTable, issuesTable, partiesTable } from "@workspace/db";
import { eq, like, or, desc } from "drizzle-orm";

const router = Router();

// GET /search?q=term — global search across tweets, politicians, issues
router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q || q.length < 2) return res.json({ tweets: [], politicians: [], issues: [] });

  const pattern = `%${q}%`;

  const [tweets, politicians, issues] = await Promise.all([
    db
      .select({
        id: tweetsTable.id,
        url: tweetsTable.url,
        authorName: tweetsTable.authorName,
        authorHandle: tweetsTable.authorHandle,
        content: tweetsTable.content,
        type: tweetsTable.type,
        sentiment: tweetsTable.sentiment,
        createdAt: tweetsTable.createdAt,
        partyName: partiesTable.name,
        partyShortName: partiesTable.shortName,
        partyColor: partiesTable.color,
      })
      .from(tweetsTable)
      .leftJoin(partiesTable, eq(tweetsTable.partyId, partiesTable.id))
      .where(
        or(
          like(tweetsTable.content, pattern),
          like(tweetsTable.authorName, pattern),
          like(tweetsTable.authorHandle, pattern),
          like(tweetsTable.tags, pattern),
        )
      )
      .orderBy(desc(tweetsTable.createdAt))
      .limit(10),

    db
      .select({
        id: politiciansTable.id,
        name: politiciansTable.name,
        twitterHandle: politiciansTable.twitterHandle,
        role: politiciansTable.role,
        constituency: politiciansTable.constituency,
        partyName: partiesTable.name,
        partyShortName: partiesTable.shortName,
        partyColor: partiesTable.color,
      })
      .from(politiciansTable)
      .leftJoin(partiesTable, eq(politiciansTable.partyId, partiesTable.id))
      .where(
        or(
          like(politiciansTable.name, pattern),
          like(politiciansTable.twitterHandle, pattern),
          like(politiciansTable.role, pattern),
          like(politiciansTable.constituency, pattern),
        )
      )
      .limit(5),

    db
      .select({
        id: issuesTable.id,
        title: issuesTable.title,
        description: issuesTable.description,
        category: issuesTable.category,
        status: issuesTable.status,
        dateOccurred: issuesTable.dateOccurred,
      })
      .from(issuesTable)
      .where(
        or(
          like(issuesTable.title, pattern),
          like(issuesTable.description, pattern),
          like(issuesTable.location, pattern),
        )
      )
      .orderBy(desc(issuesTable.createdAt))
      .limit(5),
  ]);

  return res.json({ tweets, politicians, issues });
});

export default router;
