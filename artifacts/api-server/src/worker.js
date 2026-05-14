export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password, x-api-key',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== env.API_SECRET) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const json = (data, status = 200, extra = {}) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
      });

    const adminPassword = request.headers.get('x-admin-password');
    const isAdmin = () => adminPassword === env.ADMIN_PASSWORD;
    const requireAdmin = () => isAdmin() ? null : json({ error: 'Admin access required' }, 403, corsHeaders);

    const DB = env.DB;

    // Helper: get path segments after /api/
    const apiPath = path.startsWith('/api/') ? path.slice(4) : null;

    // ─── Health ───
    if (path === '/healthz') {
      return json({ status: 'ok' });
    }

    // ─── Parties ───
    if (apiPath === 'parties' && method === 'GET') {
      await ensureParties(DB);
      const { results } = await DB.prepare('SELECT * FROM parties ORDER BY id').all();
      return json(results);
    }
    if (apiPath === 'parties' && method === 'POST') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const body = await request.json();
      const { name, shortName, color, description } = body;
      if (!name?.trim() || !shortName?.trim())
        return json({ error: 'Name and short name are required.' }, 400, corsHeaders);
      const r = await DB.prepare(
        'INSERT INTO parties (name, short_name, color, description, created_at) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING *'
      ).bind(name.trim(), shortName.trim().toUpperCase(), color || '#6b7280', description?.trim() || null, now()).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.startsWith('parties/') && method === 'PUT') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { name, shortName, color, description } = body;
      if (!name?.trim() || !shortName?.trim())
        return json({ error: 'Name and short name are required.' }, 400, corsHeaders);
      const r = await DB.prepare(
        'UPDATE parties SET name = ?1, short_name = ?2, color = ?3, description = ?4 WHERE id = ?5 RETURNING *'
      ).bind(name.trim(), shortName.trim().toUpperCase(), color || '#6b7280', description?.trim() || null, id).first();
      if (!r) return json({ error: 'Party not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('parties/') && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare('DELETE FROM parties WHERE id = ?1 RETURNING *').bind(id).first();
      if (!r) return json({ error: 'Party not found.' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Politicians ───
    if (apiPath === 'politicians' && method === 'GET') {
      const partyId = url.searchParams.get('party_id');
      const search = url.searchParams.get('search');
      let query = `SELECT p.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
        FROM politicians p LEFT JOIN parties pa ON p.party_id = pa.id WHERE 1=1`;
      const params = [];
      if (partyId) { query += ' AND p.party_id = ?' + (params.length + 1); params.push(Number(partyId)); }
      if (search) { query += ' AND p.name LIKE ?' + (params.length + 1); params.push(`%${search}%`); }
      query += ' ORDER BY p.name';
      const { results } = await DB.prepare(query).bind(...params).all();
      return json(results);
    }
    if (apiPath && apiPath.startsWith('politicians/') && apiPath.split('/').length === 2 && method === 'GET') {
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare(
        `SELECT p.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
         FROM politicians p LEFT JOIN parties pa ON p.party_id = pa.id WHERE p.id = ?1`
      ).bind(id).first();
      if (!r) return json({ error: 'Politician not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath === 'politicians' && method === 'POST') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const body = await request.json();
      const { name, partyId, twitterHandle, constituency, role, bio } = body;
      if (!name?.trim()) return json({ error: 'Name is required.' }, 400, corsHeaders);
      const handle = twitterHandle?.replace(/^@/, '').trim() || null;
      const r = await DB.prepare(
        'INSERT INTO politicians (name, party_id, twitter_handle, constituency, role, bio, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING *'
      ).bind(name.trim(), partyId ? Number(partyId) : null, handle, constituency?.trim() || null, role?.trim() || null, bio?.trim() || null, now()).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.startsWith('politicians/') && apiPath.split('/').length === 2 && method === 'PUT') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { name, partyId, twitterHandle, constituency, role, bio } = body;
      if (!name?.trim()) return json({ error: 'Name is required.' }, 400, corsHeaders);
      const handle = twitterHandle?.replace(/^@/, '').trim() || null;
      const r = await DB.prepare(
        'UPDATE politicians SET name = ?1, party_id = ?2, twitter_handle = ?3, constituency = ?4, role = ?5, bio = ?6 WHERE id = ?7 RETURNING *'
      ).bind(name.trim(), partyId ? Number(partyId) : null, handle, constituency?.trim() || null, role?.trim() || null, bio?.trim() || null, id).first();
      if (!r) return json({ error: 'Politician not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('politicians/') && apiPath.split('/').length === 2 && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare('DELETE FROM politicians WHERE id = ?1 RETURNING *').bind(id).first();
      if (!r) return json({ error: 'Politician not found.' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Events ───
    if (apiPath === 'events' && method === 'GET') {
      const { results } = await DB.prepare(
        `SELECT e.*, COUNT(t.id) as tweet_count FROM events e
         LEFT JOIN tweets t ON t.event_id = e.id GROUP BY e.id ORDER BY e.created_at DESC`
      ).all();
      return json(results);
    }
    if (apiPath === 'events' && method === 'POST') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const body = await request.json();
      const { name, description, startDate, endDate } = body;
      if (!name?.trim()) return json({ error: 'Name is required.' }, 400, corsHeaders);
      const r = await DB.prepare(
        'INSERT INTO events (name, description, start_date, end_date, created_at) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING *'
      ).bind(name.trim(), description?.trim() || null, startDate || null, endDate || null, now()).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.startsWith('events/') && apiPath.split('/').length === 2 && method === 'PUT') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { name, description, startDate, endDate } = body;
      if (!name?.trim()) return json({ error: 'Name is required.' }, 400, corsHeaders);
      const r = await DB.prepare(
        'UPDATE events SET name = ?1, description = ?2, start_date = ?3, end_date = ?4 WHERE id = ?5 RETURNING *'
      ).bind(name.trim(), description?.trim() || null, startDate || null, endDate || null, id).first();
      if (!r) return json({ error: 'Event not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('events/') && apiPath.split('/').length === 2 && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare('DELETE FROM events WHERE id = ?1 RETURNING *').bind(id).first();
      if (!r) return json({ error: 'Event not found.' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Dashboard ───
    if (apiPath === 'dashboard/stats' && method === 'GET') {
      await ensureParties(DB);
      const [partiesR, politiciansR, eventsR, totalR] = await Promise.all([
        DB.prepare('SELECT * FROM parties ORDER BY id').all(),
        DB.prepare('SELECT * FROM politicians').all(),
        DB.prepare('SELECT * FROM events').all(),
        DB.prepare('SELECT COUNT(*) as count FROM tweets').first(),
      ]);
      const parties = partiesR.results;
      const politicians = politiciansR.results;
      const events = eventsR.results;
      const totalTweets = totalR?.count ?? 0;

      const tweetsByParty = await DB.prepare(
        'SELECT party_id, COUNT(*) as count FROM tweets WHERE party_id IS NOT NULL GROUP BY party_id'
      ).all();
      const tweetCountMap = {};
      for (const r of tweetsByParty.results) tweetCountMap[r.party_id] = r.count;
      const polCountMap = {};
      for (const p of politicians) {
        if (p.party_id) polCountMap[p.party_id] = (polCountMap[p.party_id] ?? 0) + 1;
      }

      const partyStats = parties.map(p => ({
        ...p,
        tweetCount: tweetCountMap[p.id] ?? 0,
        politicianCount: polCountMap[p.id] ?? 0,
      }));

      const topPols = await DB.prepare(
        `SELECT p.id, p.name, p.twitter_handle, p.constituency, p.role, p.party_id,
          pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color,
          COUNT(t.id) as tweet_count
         FROM politicians p LEFT JOIN parties pa ON p.party_id = pa.id
         LEFT JOIN tweets t ON t.politician_id = p.id
         GROUP BY p.id, pa.id ORDER BY tweet_count DESC LIMIT 8`
      ).all();

      const recentTweets = await DB.prepare(
        `SELECT t.id, t.url, t.author_name, t.author_handle, t.content, t.type,
          t.screenshot_url, t.created_at, t.party_id,
          pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
         FROM tweets t LEFT JOIN parties pa ON t.party_id = pa.id
         ORDER BY t.created_at DESC LIMIT 6`
      ).all();

      return json({
        totalTweets,
        totalPoliticians: politicians.length,
        totalEvents: events.length,
        partyStats,
        topPoliticians: topPols.results,
        recentTweets: recentTweets.results,
      });
    }
    if (apiPath === 'dashboard/activity' && method === 'GET') {
      const since = new Date();
      since.setDate(since.getDate() - 89);
      const sinceStr = since.toISOString().slice(0, 10);
      const { results } = await DB.prepare(
        `SELECT date(created_at) as day, COUNT(*) as count FROM tweets
         WHERE created_at >= ?1 GROUP BY date(created_at) ORDER BY day`
      ).bind(sinceStr).all();
      const map = new Map(results.map(r => [r.day, r.count]));
      const result = [];
      for (let i = 0; i < 90; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        result.push({ date: key, count: map.get(key) ?? 0 });
      }
      return json(result);
    }
    if (apiPath === 'dashboard/party-activity' && method === 'GET') {
      const since = new Date();
      since.setDate(since.getDate() - 55);
      const sinceStr = since.toISOString().slice(0, 10);
      const partiesR = await DB.prepare('SELECT * FROM parties ORDER BY id').all();
      const rowsR = await DB.prepare(
        `SELECT strftime('%Y-W%W', created_at) as week, party_id, COUNT(*) as count
         FROM tweets WHERE created_at >= ?1 GROUP BY week, party_id ORDER BY week`
      ).bind(sinceStr).all();
      const parties = partiesR.results;
      const rows = rowsR.results;
      const weeks = [...new Set(rows.map(r => r.week))].sort();
      const data = weeks.map(week => {
        const entry = { week };
        for (const party of parties) {
          const row = rows.find(r => r.week === week && r.party_id === party.id);
          entry[party.short_name] = row?.count ?? 0;
        }
        return entry;
      });
      return json({ parties: parties.map(p => ({ id: p.id, shortName: p.short_name, color: p.color })), data });
    }

    // ─── Tweets ───
    if (apiPath === 'tweets' && method === 'GET') {
      const type = url.searchParams.get('type');
      const search = url.searchParams.get('search');
      const partyId = url.searchParams.get('party_id');
      const politicianId = url.searchParams.get('politicianId');
      const limit = url.searchParams.get('limit');
      let query = `SELECT t.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
        FROM tweets t LEFT JOIN parties pa ON t.party_id = pa.id WHERE 1=1`;
      const params = [];
      if (type) { query += ' AND t.type = ?' + (params.length + 1); params.push(type); }
      if (search) { query += ' AND (t.content LIKE ?' + (params.length + 1) + ' OR t.author_name LIKE ?' + (params.length + 2) + ' OR t.author_handle LIKE ?' + (params.length + 3) + ' OR t.tags LIKE ?' + (params.length + 4) + ')'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
      if (partyId) { query += ' AND t.party_id = ?' + (params.length + 1); params.push(Number(partyId)); }
      if (politicianId) { query += ' AND t.politician_id = ?' + (params.length + 1); params.push(Number(politicianId)); }
      query += ' ORDER BY t.created_at DESC';
      if (limit) query += ' LIMIT ?' + (params.length + 1); params.push(Number(limit));
      const { results } = await DB.prepare(query).bind(...params).all();
      return json(results);
    }
    if (apiPath === 'tweets' && method === 'POST') {
      const body = await request.json();
      const { url: tweetUrl, notes, tags, partyId, politicianId, eventId } = body;
      const normalizedUrl = normalizeUrl(tweetUrl?.trim());
      if (!normalizedUrl || isProfileUrl(normalizedUrl))
        return json({ error: "Invalid Twitter/X URL." }, 400, corsHeaders);
      const tweetId = extractTweetId(normalizedUrl);
      if (!tweetId) return json({ error: "Invalid tweet URL." }, 400, corsHeaders);

      const existing = await DB.prepare('SELECT * FROM tweets WHERE url = ?1').bind(normalizedUrl).first();
      if (existing) return json({ error: "This tweet is already being tracked." }, 409, corsHeaders);

      let authorHandle = null, authorName = null, content = null, type = 'unknown';
      try {
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true`;
        const oRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
        if (oRes.ok) {
          const data = await oRes.json();
          authorName = data.author_name ?? null;
          const hm = (data.author_url ?? '').match(/(?:twitter|x)\.com\/([^/]+)$/);
          authorHandle = hm ? hm[1] : null;
          content = (data.html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
          const hasImage = /pic\.twitter\.com|pbs\.twimg\.com/i.test(data.html ?? '');
          type = hasImage ? 'image' : 'text';
        }
      } catch (e) { /* oEmbed failed */ }

      let resolvedPoliticianId = politicianId ?? null;
      let resolvedPartyId = partyId ?? null;
      if (!resolvedPoliticianId && authorHandle) {
        const matched = await DB.prepare(
          'SELECT * FROM politicians WHERE twitter_handle = ?1'
        ).bind(authorHandle).first();
        if (matched) {
          resolvedPoliticianId = matched.id;
          if (!resolvedPartyId && matched.party_id) resolvedPartyId = matched.party_id;
        }
      }

      const r = await DB.prepare(
        `INSERT INTO tweets (url, tweet_id, author_handle, author_name, content, type, sentiment,
          screenshot_url, notes, tags, party_id, politician_id, event_id, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15) RETURNING *`
      ).bind(normalizedUrl, tweetId, authorHandle, authorName, content, type, 'neutral', null,
        notes ?? null, tags ?? null, resolvedPartyId, resolvedPoliticianId, eventId ?? null, now(), now()).first();
      return json(r, 201);
    }
    if (apiPath === 'tweets/preview' && method === 'GET') {
      const rawUrl = (url.searchParams.get('url') || '').trim();
      if (!rawUrl) return json({ error: 'url is required' }, 400, corsHeaders);
      const normalizedUrl = normalizeUrl(rawUrl);
      if (isProfileUrl(normalizedUrl)) return json({ error: 'Profile URL, not a tweet' }, 400, corsHeaders);
      const tweetId = extractTweetId(normalizedUrl);
      if (!tweetId) return json({ error: 'Not a valid tweet URL' }, 400, corsHeaders);

      const existing = await DB.prepare('SELECT id FROM tweets WHERE url = ?1').bind(normalizedUrl).first();
      const isDuplicate = !!existing;

      let authorHandle = null, authorName = null, content = null;
      try {
        const oRes = await fetch(
          `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (oRes.ok) {
          const data = await oRes.json();
          authorName = data.author_name ?? null;
          const hm = (data.author_url ?? '').match(/(?:twitter|x)\.com\/([^/]+)$/);
          authorHandle = hm ? hm[1] : null;
          content = (data.html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
        }
      } catch (e) { /* ignore */ }

      let detectedPoliticianId = null, detectedPoliticianName = null;
      let detectedPartyId = null, detectedPartyShortName = null;
      if (authorHandle) {
        const matched = await DB.prepare(
          'SELECT p.*, pa.short_name as party_short FROM politicians p LEFT JOIN parties pa ON p.party_id = pa.id WHERE p.twitter_handle = ?1'
        ).bind(authorHandle).first();
        if (matched) {
          detectedPoliticianId = matched.id;
          detectedPoliticianName = matched.name;
          detectedPartyId = matched.party_id;
          detectedPartyShortName = matched.party_short || null;
        }
      }

      return json({
        tweetId, authorHandle, authorName, content,
        isDuplicate, existingId: existing?.id ?? null,
        detectedPoliticianId, detectedPoliticianName,
        detectedPartyId, detectedPartyShortName,
      });
    }
    if (apiPath === 'tweets/stats' && method === 'GET') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [totalR, typeR, ssR, recentR] = await Promise.all([
        DB.prepare('SELECT COUNT(*) as count FROM tweets').first(),
        DB.prepare('SELECT type, COUNT(*) as count FROM tweets GROUP BY type').all(),
        DB.prepare('SELECT COUNT(*) as count FROM tweets WHERE screenshot_url IS NOT NULL').first(),
        DB.prepare('SELECT COUNT(*) as count FROM tweets WHERE created_at >= ?1').bind(oneDayAgo).first(),
      ]);
      const typeCounts = { text: 0, image: 0, mixed: 0 };
      for (const r of typeR.results) {
        if (r.type === 'text') typeCounts.text = r.count;
        else if (r.type === 'image') typeCounts.image = r.count;
        else if (r.type === 'mixed') typeCounts.mixed = r.count;
      }
      return json({
        total: totalR?.count ?? 0,
        textOnly: typeCounts.text,
        imageBased: typeCounts.image,
        mixed: typeCounts.mixed,
        withScreenshots: ssR?.count ?? 0,
        recentlyAdded: recentR?.count ?? 0,
      });
    }
    if (apiPath === 'tweets/gallery' && method === 'GET') {
      const { results } = await DB.prepare('SELECT * FROM tweets ORDER BY created_at DESC').all();
      return json(results);
    }
    if (apiPath === 'tweets/admin-check' && method === 'POST') {
      const err = requireAdmin(); if (err) return err;
      return json({ ok: true });
    }
    if (apiPath && apiPath.startsWith('tweets/') && apiPath.endsWith('/tags') && method === 'PATCH') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const parts = apiPath.split('/');
      const id = Number(parts[1]);
      if (isNaN(id)) return json({ error: 'Invalid tweet ID' }, 400, corsHeaders);
      const body = await request.json();
      const { partyId: pId, politicianId: polId, eventId: eId } = body;
      const r = await DB.prepare(
        `UPDATE tweets SET party_id = ?1, politician_id = ?2, event_id = ?3, updated_at = ?4 WHERE id = ?5 RETURNING *`
      ).bind(pId ?? null, polId ?? null, eId ?? null, now(), id).first();
      if (!r) return json({ error: 'Tweet not found' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('tweets/') && apiPath.endsWith('/refresh') && method === 'POST') {
      const parts = apiPath.split('/');
      const id = Number(parts[1]);
      const existing = await DB.prepare('SELECT * FROM tweets WHERE id = ?1').bind(id).first();
      if (!existing) return json({ error: 'Tweet not found' }, 404, corsHeaders);
      let authorHandle = existing.author_handle, authorName = existing.author_name, content = existing.content, type = existing.type;
      try {
        const oRes = await fetch(
          `https://publish.twitter.com/oembed?url=${encodeURIComponent(existing.url)}&omit_script=true`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (oRes.ok) {
          const data = await oRes.json();
          authorName = data.author_name ?? authorName;
          const hm = (data.author_url ?? '').match(/(?:twitter|x)\.com\/([^/]+)$/);
          authorHandle = hm ? hm[1] : authorHandle;
          content = (data.html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() || content;
          type = /pic\.twitter\.com|pbs\.twimg\.com/i.test(data.html ?? '') ? 'image' : type;
        }
      } catch (e) { /* ignore */ }
      const r = await DB.prepare(
        `UPDATE tweets SET author_handle = ?1, author_name = ?2, content = ?3, type = ?4, updated_at = ?5 WHERE id = ?6 RETURNING *`
      ).bind(authorHandle, authorName, content, type, now(), id).first();
      return json(r);
    }
    if (apiPath && apiPath.startsWith('tweets/') && apiPath.split('/').length === 2 && method === 'GET') {
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare('SELECT * FROM tweets WHERE id = ?1').bind(id).first();
      if (!r) return json({ error: 'Tweet not found' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('tweets/') && apiPath.split('/').length === 2 && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare('DELETE FROM tweets WHERE id = ?1 RETURNING *').bind(id).first();
      if (!r) return json({ error: 'Tweet not found' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Issues ───
    if (apiPath === 'issues/matrix' && method === 'GET') {
      const [issuesR, partiesR, actionsR] = await Promise.all([
        DB.prepare('SELECT * FROM issues ORDER BY date_occurred DESC, created_at DESC').all(),
        DB.prepare('SELECT * FROM parties ORDER BY id').all(),
        DB.prepare(
          `SELECT ia.*, pa.short_name as party_short_name, pa.color as party_color, pol.name as politician_name
           FROM issue_actions ia LEFT JOIN parties pa ON ia.party_id = pa.id
           LEFT JOIN politicians pol ON ia.politician_id = pol.id`
        ).all(),
      ]);
      const issues = issuesR.results.map(issue => {
        const responses = {};
        for (const party of partiesR.results) responses[party.short_name] = [];
        for (const action of actionsR.results) {
          if (action.issue_id === issue.id && action.party_short_name) {
            if (!responses[action.party_short_name]) responses[action.party_short_name] = [];
            responses[action.party_short_name].push({
              actionType: action.action_type, description: action.description,
              politicianName: action.politician_name, sourceUrl: action.source_url,
            });
          }
        }
        return { ...issue, responses };
      });
      return json({ parties: partiesR.results, issues });
    }
    if (apiPath === 'issues' && method === 'GET') {
      const category = url.searchParams.get('category');
      const status = url.searchParams.get('status');
      const partyId = url.searchParams.get('party_id');
      let query = 'SELECT * FROM issues WHERE 1=1';
      const params = [];
      if (category) { query += ' AND category = ?' + (params.length + 1); params.push(category); }
      if (status) { query += ' AND status = ?' + (params.length + 1); params.push(status); }
      if (partyId) { query += ' AND id IN (SELECT DISTINCT issue_id FROM issue_actions WHERE party_id = ?' + (params.length + 1) + ')'; params.push(Number(partyId)); }
      query += ' ORDER BY created_at DESC';
      const { results: issues } = await DB.prepare(query).bind(...params).all();
      const { results: actions } = await DB.prepare('SELECT issue_id FROM issue_actions').all();
      const actionCounts = {};
      for (const a of actions) actionCounts[a.issue_id] = (actionCounts[a.issue_id] ?? 0) + 1;
      return json(issues.map(i => ({ ...i, actionCount: actionCounts[i.id] ?? 0 })));
    }
    if (apiPath === 'issues' && method === 'POST') {
      const body = await request.json();
      const { title, description, category, dateOccurred, sourceUrl, location, createdBy } = body;
      if (!title?.trim()) return json({ error: 'Title is required.' }, 400, corsHeaders);
      const ts = now();
      const r = await DB.prepare(
        `INSERT INTO issues (title, description, category, status, date_occurred, source_url, location, created_by, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10) RETURNING *`
      ).bind(title.trim(), description?.trim() || null, category || 'other', 'open',
        dateOccurred || null, sourceUrl?.trim() || null, location?.trim() || null, createdBy?.trim() || null, ts, ts).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.startsWith('issues/') && apiPath.endsWith('/status') && method === 'PATCH') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { status } = body;
      if (!['open', 'in_progress', 'resolved'].includes(status))
        return json({ error: 'Invalid status' }, 400, corsHeaders);
      const r = await DB.prepare(
        'UPDATE issues SET status = ?1, updated_at = ?2 WHERE id = ?3 RETURNING *'
      ).bind(status, now(), id).first();
      if (!r) return json({ error: 'Issue not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('issues/') && apiPath.endsWith('/actions') && !apiPath.includes('/actions/') && method === 'POST') {
      const issueId = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { partyId, politicianId, actionType, description, sourceUrl, createdBy } = body;
      if (!actionType) return json({ error: 'Action type is required.' }, 400, corsHeaders);
      const r = await DB.prepare(
        `INSERT INTO issue_actions (issue_id, party_id, politician_id, action_type, description, source_url, created_by, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8) RETURNING *`
      ).bind(issueId, partyId ? Number(partyId) : null, politicianId ? Number(politicianId) : null,
        actionType, description?.trim() || null, sourceUrl?.trim() || null, createdBy?.trim() || null, now()).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.includes('/actions/') && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const m = apiPath.match(/^issues\/\d+\/actions\/(\d+)$/);
      if (!m) return json({ error: 'Not found' }, 404, corsHeaders);
      const actionId = Number(m[1]);
      const r = await DB.prepare('DELETE FROM issue_actions WHERE id = ?1 RETURNING *').bind(actionId).first();
      if (!r) return json({ error: 'Action not found.' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (apiPath && apiPath.includes('/tweet-links/') && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const m = apiPath.match(/^issues\/(\d+)\/tweet-links\/(\d+)$/);
      if (!m) return json({ error: 'Not found' }, 404, corsHeaders);
      await DB.prepare('DELETE FROM tweet_issue_links WHERE issue_id = ?1 AND tweet_id = ?2')
        .bind(Number(m[1]), Number(m[2])).run();
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (apiPath && apiPath.endsWith('/tweet-links') && method === 'POST') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const issueId = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { tweetId } = body;
      if (!tweetId) return json({ error: 'tweetId is required.' }, 400, corsHeaders);
      const tweet = await DB.prepare('SELECT * FROM tweets WHERE id = ?1').bind(Number(tweetId)).first();
      if (!tweet) return json({ error: 'Tweet not found.' }, 404, corsHeaders);
      const existing = await DB.prepare(
        'SELECT * FROM tweet_issue_links WHERE issue_id = ?1 AND tweet_id = ?2'
      ).bind(issueId, Number(tweetId)).first();
      if (existing) return json({ error: 'Already linked.' }, 409, corsHeaders);
      const r = await DB.prepare(
        'INSERT INTO tweet_issue_links (tweet_id, issue_id, created_at) VALUES (?1,?2,?3) RETURNING *'
      ).bind(Number(tweetId), issueId, now()).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.startsWith('issues/') && apiPath.split('/').length === 2 && method === 'GET') {
      const id = Number(apiPath.split('/')[1]);
      const issue = await DB.prepare('SELECT * FROM issues WHERE id = ?1').bind(id).first();
      if (!issue) return json({ error: 'Issue not found.' }, 404, corsHeaders);
      const [actionsR, linksR] = await Promise.all([
        DB.prepare(
          `SELECT ia.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color,
            pol.name as politician_name FROM issue_actions ia
           LEFT JOIN parties pa ON ia.party_id = pa.id
           LEFT JOIN politicians pol ON ia.politician_id = pol.id
           WHERE ia.issue_id = ?1 ORDER BY ia.created_at`
        ).bind(id).all(),
        DB.prepare('SELECT * FROM tweet_issue_links WHERE issue_id = ?1').bind(id).all(),
      ]);
      let linkedTweets = [];
      if (linksR.results.length > 0) {
        const tweetIds = linksR.results.map(l => l.tweet_id);
        const placeholders = tweetIds.map(() => '?').join(',');
        const { results } = await DB.prepare(
          `SELECT t.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
           FROM tweets t LEFT JOIN parties pa ON t.party_id = pa.id
           WHERE t.id IN (${placeholders})`
        ).bind(...tweetIds).all();
        linkedTweets = results;
      }
      return json({ ...issue, actions: actionsR.results, linkedTweets });
    }
    if (apiPath && apiPath.startsWith('issues/') && apiPath.split('/').length === 2 && method === 'PUT') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { title, description, category, dateOccurred, sourceUrl, location } = body;
      if (title && !title.trim()) return json({ error: 'Title is required.' }, 400, corsHeaders);
      const r = await DB.prepare(
        `UPDATE issues SET title = ?1, description = ?2, category = ?3, date_occurred = ?4, source_url = ?5, location = ?6, updated_at = ?7
         WHERE id = ?8 RETURNING *`
      ).bind(title.trim(), description?.trim() || null, category || 'other', dateOccurred || null,
        sourceUrl?.trim() || null, location?.trim() || null, now(), id).first();
      if (!r) return json({ error: 'Issue not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('issues/') && apiPath.split('/').length === 2 && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      await DB.prepare('DELETE FROM issue_actions WHERE issue_id = ?1').bind(id).run();
      await DB.prepare('DELETE FROM tweet_issue_links WHERE issue_id = ?1').bind(id).run();
      const r = await DB.prepare('DELETE FROM issues WHERE id = ?1 RETURNING *').bind(id).first();
      if (!r) return json({ error: 'Issue not found.' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Pending ───
    if (apiPath === 'pending' && method === 'GET') {
      const { results } = await DB.prepare('SELECT * FROM pending_tweets ORDER BY created_at DESC').all();
      return json(results);
    }
    if (apiPath === 'pending/count' && method === 'GET') {
      const r = await DB.prepare(
        "SELECT COUNT(*) as count FROM pending_tweets WHERE status = 'pending'"
      ).first();
      return json({ count: r?.count ?? 0 });
    }
    if (apiPath && apiPath.startsWith('pending/') && apiPath.endsWith('/approve') && method === 'POST') {
      const id = Number(apiPath.split('/')[1]);
      const pending = await DB.prepare('SELECT * FROM pending_tweets WHERE id = ?1').bind(id).first();
      if (!pending) return json({ error: 'Not found' }, 404, corsHeaders);
      const existing = await DB.prepare('SELECT id FROM tweets WHERE url = ?1').bind(pending.url).first();
      if (!existing) {
        await DB.prepare(
          `INSERT INTO tweets (url, tweet_id, author_handle, author_name, content, type, sentiment,
            screenshot_url, notes, tags, party_id, politician_id, event_id, created_at, updated_at)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
        ).bind(pending.url, pending.tweet_id, pending.author_handle, pending.author_name,
          pending.content, pending.type, pending.sentiment, null,
          `Community submission by @${pending.submitted_by_handle ?? 'unknown'}`, 'community',
          pending.party_id, pending.politician_id, null, pending.created_at, now()).run();
      }
      await DB.prepare("UPDATE pending_tweets SET status = 'approved' WHERE id = ?1").bind(id).run();
      return json({ ok: true });
    }
    if (apiPath && apiPath.startsWith('pending/') && apiPath.endsWith('/reject') && method === 'POST') {
      const id = Number(apiPath.split('/')[1]);
      await DB.prepare("UPDATE pending_tweets SET status = 'rejected' WHERE id = ?1").bind(id).run();
      return json({ ok: true });
    }
    if (apiPath && apiPath.startsWith('pending/') && apiPath.endsWith('/revoke') && method === 'POST') {
      const id = Number(apiPath.split('/')[1]);
      await DB.prepare("UPDATE pending_tweets SET status = 'pending' WHERE id = ?1").bind(id).run();
      return json({ ok: true });
    }
    if (apiPath && apiPath.startsWith('pending/') && apiPath.split('/').length === 2 && method === 'DELETE') {
      const id = Number(apiPath.split('/')[1]);
      await DB.prepare('DELETE FROM pending_tweets WHERE id = ?1').bind(id).run();
      return json({ ok: true });
    }
    if (apiPath === 'pending/bulk' && method === 'POST') {
      const body = await request.json();
      const { ids, action } = body;
      if (!Array.isArray(ids) || ids.length === 0) return json({ error: 'ids array required' }, 400, corsHeaders);
      if (!['approve', 'reject', 'delete'].includes(action))
        return json({ error: 'action must be approve, reject, or delete' }, 400, corsHeaders);

      let done = 0;
      if (action === 'delete') {
        for (const id of ids) {
          await DB.prepare('DELETE FROM pending_tweets WHERE id = ?1').bind(id).run();
          done++;
        }
      } else if (action === 'reject') {
        for (const id of ids) {
          await DB.prepare("UPDATE pending_tweets SET status = 'rejected' WHERE id = ?1").bind(id).run();
          done++;
        }
      } else {
        for (const id of ids) {
          const pending = await DB.prepare('SELECT * FROM pending_tweets WHERE id = ?1').bind(id).first();
          if (!pending) continue;
          const existing = await DB.prepare('SELECT id FROM tweets WHERE url = ?1').bind(pending.url).first();
          if (!existing) {
            await DB.prepare(
              `INSERT INTO tweets (url, tweet_id, author_handle, author_name, content, type, sentiment,
                screenshot_url, notes, tags, party_id, politician_id, event_id, created_at, updated_at)
               VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
            ).bind(pending.url, pending.tweet_id, pending.author_handle, pending.author_name,
              pending.content, pending.type, pending.sentiment, null,
              `Community submission by @${pending.submitted_by_handle ?? 'unknown'}`, 'community',
              pending.party_id, pending.politician_id, null, pending.created_at, now()).run();
          }
          await DB.prepare("UPDATE pending_tweets SET status = 'approved' WHERE id = ?1").bind(id).run();
          done++;
        }
      }
      return json({ ok: true, done });
    }

    // ─── Schemes ───
    if (apiPath === 'schemes' && method === 'GET') {
      const partyId = url.searchParams.get('party_id');
      const manifesto = url.searchParams.get('manifesto');
      let query = `SELECT s.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
        FROM schemes s LEFT JOIN parties pa ON s.party_id = pa.id WHERE 1=1`;
      const params = [];
      if (partyId) { query += ' AND s.party_id = ?' + (params.length + 1); params.push(Number(partyId)); }
      if (manifesto === 'true') { query += ' AND s.manifesto_promise = 1'; }
      query += ' ORDER BY s.created_at DESC';
      const { results } = await DB.prepare(query).bind(...params).all();
      return json(results);
    }
    if (apiPath === 'schemes' && method === 'POST') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const body = await request.json();
      const { title, description, partyId, dateAnnounced, manifestoPromise, status, responseUrl, newspaperUrl, youtubeUrl } = body;
      if (!title?.trim()) return json({ error: 'Title is required.' }, 400, corsHeaders);
      const ts = now();
      const r = await DB.prepare(
        `INSERT INTO schemes (title, description, party_id, date_announced, manifesto_promise, status,
          response_url, newspaper_url, youtube_url, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11) RETURNING *`
      ).bind(title.trim(), description?.trim() || null, partyId ? Number(partyId) : null,
        dateAnnounced || null, manifestoPromise === true || manifestoPromise === 'true' ? 1 : 0,
        status || 'announced', responseUrl?.trim() || null, newspaperUrl?.trim() || null,
        youtubeUrl?.trim() || null, ts, ts).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.startsWith('schemes/') && apiPath.split('/').length === 2 && method === 'GET') {
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare(
        `SELECT s.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
         FROM schemes s LEFT JOIN parties pa ON s.party_id = pa.id WHERE s.id = ?1`
      ).bind(id).first();
      if (!r) return json({ error: 'Scheme not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('schemes/') && apiPath.split('/').length === 2 && method === 'PATCH') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const body = await request.json();
      const { title, description, partyId, dateAnnounced, manifestoPromise, status, responseUrl, newspaperUrl, youtubeUrl } = body;
      const sets = ['updated_at = ?1'];
      const params = [now()];
      if (title !== undefined) { sets.push(`title = ?${params.length + 1}`); params.push(title.trim()); }
      if (description !== undefined) { sets.push(`description = ?${params.length + 1}`); params.push(description?.trim() || null); }
      if (partyId !== undefined) { sets.push(`party_id = ?${params.length + 1}`); params.push(partyId ? Number(partyId) : null); }
      if (dateAnnounced !== undefined) { sets.push(`date_announced = ?${params.length + 1}`); params.push(dateAnnounced || null); }
      if (manifestoPromise !== undefined) { sets.push(`manifesto_promise = ?${params.length + 1}`); params.push(manifestoPromise === true || manifestoPromise === 'true' ? 1 : 0); }
      if (status !== undefined) { sets.push(`status = ?${params.length + 1}`); params.push(status); }
      if (responseUrl !== undefined) { sets.push(`response_url = ?${params.length + 1}`); params.push(responseUrl?.trim() || null); }
      if (newspaperUrl !== undefined) { sets.push(`newspaper_url = ?${params.length + 1}`); params.push(newspaperUrl?.trim() || null); }
      if (youtubeUrl !== undefined) { sets.push(`youtube_url = ?${params.length + 1}`); params.push(youtubeUrl?.trim() || null); }
      params.push(id);
      const r = await DB.prepare(
        `UPDATE schemes SET ${sets.join(', ')} WHERE id = ?${params.length} RETURNING *`
      ).bind(...params).first();
      if (!r) return json({ error: 'Scheme not found.' }, 404, corsHeaders);
      return json(r);
    }
    if (apiPath && apiPath.startsWith('schemes/') && apiPath.split('/').length === 2 && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/')[1]);
      const r = await DB.prepare('DELETE FROM schemes WHERE id = ?1 RETURNING *').bind(id).first();
      if (!r) return json({ error: 'Scheme not found.' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Votes ───
    if (apiPath === 'votes' && method === 'GET') {
      const tweetIdsStr = url.searchParams.get('tweetIds');
      const fingerprint = url.searchParams.get('fingerprint');
      if (!tweetIdsStr) return json({ error: 'tweetIds is required' }, 400, corsHeaders);
      const ids = tweetIdsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      if (ids.length === 0) return json({});
      const placeholders = ids.map(() => '?').join(',');
      const { results: allVotes } = await DB.prepare(
        `SELECT * FROM tweet_votes WHERE tweet_id IN (${placeholders})`
      ).bind(...ids).all();
      const result = {};
      for (const id of ids) result[id] = { likes: 0, dislikes: 0, userVote: null };
      for (const vote of allVotes) {
        if (!result[vote.tweet_id]) continue;
        if (vote.vote_type === 'like') result[vote.tweet_id].likes++;
        else result[vote.tweet_id].dislikes++;
        if (fingerprint && vote.fingerprint === fingerprint)
          result[vote.tweet_id].userVote = vote.vote_type;
      }
      return json(result);
    }
    if (apiPath === 'votes/best-week' && method === 'GET') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { results: rows } = await DB.prepare(
        `SELECT tweet_id, SUM(CASE WHEN vote_type = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN vote_type = 'dislike' THEN 1 ELSE 0 END) as dislikes
         FROM tweet_votes WHERE created_at >= ?1 GROUP BY tweet_id ORDER BY likes DESC LIMIT 10`
      ).bind(since).all();
      if (rows.length === 0) return json({ tweet: null, leaderboard: [] });
      const tweetIds = rows.map(r => r.tweet_id);
      const placeholders = tweetIds.map(() => '?').join(',');
      const { results: tweets } = await DB.prepare(
        `SELECT * FROM tweets WHERE id IN (${placeholders})`
      ).bind(...tweetIds).all();
      const tweetMap = Object.fromEntries(tweets.map(t => [t.id, t]));
      const leaderboard = rows.map(r => ({
        tweet: tweetMap[r.tweet_id] ?? null,
        likes: Number(r.likes), dislikes: Number(r.dislikes),
        score: Number(r.likes) - Number(r.dislikes),
      })).filter(r => r.tweet);
      return json({
        tweet: leaderboard[0]?.tweet ?? null,
        likes: leaderboard[0]?.likes ?? 0,
        dislikes: leaderboard[0]?.dislikes ?? 0,
        leaderboard,
      });
    }
    if (apiPath === 'votes/all-time' && method === 'GET') {
      const { results: rows } = await DB.prepare(
        `SELECT tweet_id, SUM(CASE WHEN vote_type = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN vote_type = 'dislike' THEN 1 ELSE 0 END) as dislikes
         FROM tweet_votes GROUP BY tweet_id ORDER BY likes DESC LIMIT 10`
      ).all();
      if (rows.length === 0) return json([]);
      const tweetIds = rows.map(r => r.tweet_id);
      const placeholders = tweetIds.map(() => '?').join(',');
      const { results: tweets } = await DB.prepare(
        `SELECT * FROM tweets WHERE id IN (${placeholders})`
      ).bind(...tweetIds).all();
      const tweetMap = Object.fromEntries(tweets.map(t => [t.id, t]));
      return json(rows.map(r => ({
        tweet: tweetMap[r.tweet_id] ?? null,
        likes: Number(r.likes), dislikes: Number(r.dislikes),
        score: Number(r.likes) - Number(r.dislikes),
      })).filter(r => r.tweet));
    }
    if (apiPath === 'votes' && method === 'POST') {
      const body = await request.json();
      const { tweetId, voteType, fingerprint } = body;
      if (!tweetId || !voteType || !fingerprint)
        return json({ error: 'tweetId, voteType, fingerprint are required' }, 400, corsHeaders);
      if (!['like', 'dislike'].includes(voteType))
        return json({ error: 'voteType must be like or dislike' }, 400, corsHeaders);

      const tweet = await DB.prepare('SELECT id FROM tweets WHERE id = ?1').bind(Number(tweetId)).first();
      if (!tweet) return json({ error: 'Tweet not found' }, 404, corsHeaders);

      const existing = await DB.prepare(
        'SELECT * FROM tweet_votes WHERE tweet_id = ?1 AND fingerprint = ?2'
      ).bind(Number(tweetId), fingerprint).first();

      if (existing) {
        if (existing.vote_type === voteType) {
          await DB.prepare('DELETE FROM tweet_votes WHERE id = ?1').bind(existing.id).run();
          return json({ action: 'removed', voteType: null });
        } else {
          await DB.prepare(
            'UPDATE tweet_votes SET vote_type = ?1, created_at = ?2 WHERE id = ?3'
          ).bind(voteType, now(), existing.id).run();
          return json({ action: 'switched', voteType });
        }
      }

      await DB.prepare(
        'INSERT INTO tweet_votes (tweet_id, vote_type, fingerprint, created_at) VALUES (?1,?2,?3,?4)'
      ).bind(Number(tweetId), voteType, fingerprint, now()).run();
      return json({ action: 'added', voteType }, 201);
    }

    // ─── Attendance ───
    if (apiPath === 'attendance/members' && method === 'GET') {
      await ensureAttendanceMembers(DB);
      const { results } = await DB.prepare('SELECT * FROM attendance_members ORDER BY id').all();
      return json(results);
    }
    if (apiPath && apiPath.startsWith('attendance/members/') && method === 'PUT') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const slot = apiPath.split('/').pop();
      const validSlots = ['conservative', 'opponent_1', 'opponent_2', 'opponent_3'];
      if (!validSlots.includes(slot)) return json({ error: 'Invalid slot.' }, 400, corsHeaders);
      const body = await request.json();
      const { name } = body;
      if (!name || typeof name !== 'string' || !name.trim())
        return json({ error: 'Name is required.' }, 400, corsHeaders);
      await ensureAttendanceMembers(DB);
      const r = await DB.prepare(
        'UPDATE attendance_members SET name = ?1, updated_at = ?2 WHERE slot = ?3 RETURNING *'
      ).bind(name.trim(), now(), slot).first();
      return json(r);
    }
    if (apiPath === 'attendance/records' && method === 'GET') {
      const { results } = await DB.prepare(
        'SELECT * FROM attendance_records ORDER BY date DESC, created_at DESC'
      ).all();
      return json(results);
    }
    if (apiPath === 'attendance/records' && method === 'POST') {
      const body = await request.json();
      const { date, conservativeStatus, speechUrl, opponent1Status, opponent2Status, opponent3Status, notes } = body;
      if (!date || typeof date !== 'string') return json({ error: 'Date is required.' }, 400, corsHeaders);
      const validStatuses = ['present', 'absent'];
      if (!validStatuses.includes(conservativeStatus) || !validStatuses.includes(opponent1Status) ||
          !validStatuses.includes(opponent2Status) || !validStatuses.includes(opponent3Status))
        return json({ error: 'Invalid status value.' }, 400, corsHeaders);
      const r = await DB.prepare(
        `INSERT INTO attendance_records (date, conservative_status, speech_url, opponent_1_status,
          opponent_2_status, opponent_3_status, notes, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8) RETURNING *`
      ).bind(date, conservativeStatus, speechUrl?.trim() || null,
        opponent1Status, opponent2Status, opponent3Status, notes?.trim() || null, now()).first();
      return json(r, 201);
    }
    if (apiPath && apiPath.startsWith('attendance/records/') && method === 'DELETE') {
      const adminErr = requireAdmin(); if (adminErr) return adminErr;
      const id = Number(apiPath.split('/').pop());
      if (!id || isNaN(id)) return json({ error: 'Invalid ID.' }, 400, corsHeaders);
      const r = await DB.prepare('DELETE FROM attendance_records WHERE id = ?1 RETURNING *').bind(id).first();
      if (!r) return json({ error: 'Record not found.' }, 404, corsHeaders);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ─── Search ───
    if (apiPath === 'search' && method === 'GET') {
      const q = url.searchParams.get('q')?.trim() || '';
      if (!q || q.length < 2) return json({ tweets: [], politicians: [], issues: [] });
      const pattern = `%${q}%`;
      const [tweetsR, politiciansR, issuesR] = await Promise.all([
        DB.prepare(
          `SELECT t.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
           FROM tweets t LEFT JOIN parties pa ON t.party_id = pa.id
           WHERE t.content LIKE ?1 OR t.author_name LIKE ?2 OR t.author_handle LIKE ?3 OR t.tags LIKE ?4
           ORDER BY t.created_at DESC LIMIT 10`
        ).bind(pattern, pattern, pattern, pattern).all(),
        DB.prepare(
          `SELECT p.*, pa.name as party_name, pa.short_name as party_short_name, pa.color as party_color
           FROM politicians p LEFT JOIN parties pa ON p.party_id = pa.id
           WHERE p.name LIKE ?1 OR p.twitter_handle LIKE ?2 OR p.role LIKE ?3 OR p.constituency LIKE ?4 LIMIT 5`
        ).bind(pattern, pattern, pattern, pattern).all(),
        DB.prepare(
          `SELECT * FROM issues WHERE title LIKE ?1 OR description LIKE ?2 OR location LIKE ?3
           ORDER BY created_at DESC LIMIT 5`
        ).bind(pattern, pattern, pattern).all(),
      ]);
      return json({
        tweets: tweetsR.results,
        politicians: politiciansR.results,
        issues: issuesR.results,
      });
    }

    // ─── Sync ───
    if (apiPath === 'sync/politicians' && method === 'GET') {
      const { results } = await DB.prepare(
        `SELECT p.*, pa.short_name as party_short_name, pa.color as party_color
         FROM politicians p LEFT JOIN parties pa ON p.party_id = pa.id
         WHERE p.twitter_handle LIKE '_%'`
      ).all();
      return json(results);
    }
    if (apiPath === 'sync/tweets' && method === 'POST') {
      return json({ error: 'Sync requires Twitter API credentials. Configure TWITTER_AUTH_TOKEN in Cloudflare Dashboard variables.' }, 503, corsHeaders);
    }
    if (apiPath === 'sync/all' && method === 'POST') {
      return json({ error: 'Sync requires Twitter API credentials. Configure TWITTER_AUTH_TOKEN in Cloudflare Dashboard variables.' }, 503, corsHeaders);
    }
    if (apiPath === 'sync/mentions' && method === 'POST') {
      return json({ error: 'Mentions sync requires Twitter API credentials. Configure TWITTER_AUTH_TOKEN in Cloudflare Dashboard variables.' }, 503, corsHeaders);
    }

    // ─── 404 ───
    return json({ error: 'Endpoint not found', path }, 404, corsHeaders);
  }
};

// ─── Helpers ───

function now() {
  return new Date().toISOString();
}

function normalizeUrl(url) {
  if (!url) return '';
  return url.replace(/[?#].*$/, '').replace(/\/$/, '');
}

function isProfileUrl(url) {
  return /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/?$/.test(url);
}

function extractTweetId(url) {
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

const DEFAULT_PARTIES = [
  ['DMK', 'DMK', '#e63946', 'Dravida Munnetra Kazhagam'],
  ['TVK', 'TVK', '#2a9d8f', 'Tamilaga Vettri Kazhagam'],
  ['ADMK', 'ADMK', '#264653', 'All India Anna Dravida Munnetra Kazhagam'],
  ['BJP', 'BJP', '#e9c46a', 'Bharatiya Janata Party'],
  ['INC', 'INC', '#457b9d', 'Indian National Congress'],
  ['Other', 'Other', '#6b7280', 'Other parties'],
];

async function ensureParties(DB) {
  const r = await DB.prepare('SELECT COUNT(*) as count FROM parties').first();
  if (r?.count === 0) {
    const ts = now();
    for (const [name, shortName, color, description] of DEFAULT_PARTIES) {
      await DB.prepare(
        'INSERT OR IGNORE INTO parties (name, short_name, color, description, created_at) VALUES (?1, ?2, ?3, ?4, ?5)'
      ).bind(name, shortName, color, description, ts).run();
    }
  }
}

const DEFAULT_MEMBERS = [
  ['conservative', 'Conservative Member'],
  ['opponent_1', 'Opponent 1'],
  ['opponent_2', 'Opponent 2'],
  ['opponent_3', 'Opponent 3'],
];

async function ensureAttendanceMembers(DB) {
  const ts = now();
  for (const [slot, name] of DEFAULT_MEMBERS) {
    await DB.prepare(
      'INSERT OR IGNORE INTO attendance_members (slot, name, updated_at) VALUES (?1, ?2, ?3)'
    ).bind(slot, name, ts).run();
  }
}
