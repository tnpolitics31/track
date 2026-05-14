export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password, x-api-key',
    };

    // Preflight - must be before API key check
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Key protection
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== env.API_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/healthz') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const path = url.pathname.replace('/api/', '');

    if (path === 'parties') {
      const { results } = await env.DB.prepare('SELECT * FROM parties ORDER BY id').all();
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'politicians') {
      const { results } = await env.DB.prepare('SELECT * FROM politicians ORDER BY id').all();
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'events') {
      const { results } = await env.DB.prepare('SELECT * FROM events ORDER BY date DESC').all();
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'tweets') {
      const { results } = await env.DB.prepare('SELECT * FROM tweets ORDER BY created_at DESC LIMIT 50').all();
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'dashboard/stats') {
      const tweets = await env.DB.prepare('SELECT COUNT(*) as count FROM tweets').first();
      const politicians = await env.DB.prepare('SELECT COUNT(*) as count FROM politicians').first();
      const parties = await env.DB.prepare('SELECT COUNT(*) as count FROM parties').first();
      const events = await env.DB.prepare('SELECT COUNT(*) as count FROM events').first();

      const partyStats = await env.DB.prepare(`
        SELECT p.*, 
          (SELECT COUNT(*) FROM tweets WHERE party_id = p.id) as tweet_count,
          (SELECT COUNT(*) FROM politicians WHERE party_id = p.id) as politician_count
        FROM parties p ORDER BY p.id
      `).all();

      return new Response(JSON.stringify({
        totalTweets: tweets?.count ?? 0,
        totalPoliticians: politicians?.count ?? 0,
        totalEvents: events?.count ?? 0,
        totalParties: parties?.count ?? 0,
        partyStats,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'dashboard/activity') {
      const since = new Date();
      since.setDate(since.getDate() - 89);
      const sinceStr = since.toISOString().split('T')[0];

      const rows = await env.DB.prepare(`
        SELECT date(created_at) as day, COUNT(*) as count
        FROM tweets
        WHERE created_at >= ?
        GROUP BY date(created_at)
        ORDER BY day
      `).all(sinceStr);

      return new Response(JSON.stringify(rows), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'dashboard/party-activity') {
      const parties = await env.DB.prepare('SELECT * FROM parties ORDER BY id').all();
      const since = new Date();
      since.setDate(since.getDate() - 55);
      const sinceStr = since.toISOString().split('T')[0];

      const rows = await env.DB.prepare(`
        SELECT strftime('%Y-W%W', created_at) as week, party_id, COUNT(*) as count
        FROM tweets
        WHERE created_at >= ?
        GROUP BY week, party_id
        ORDER BY week
      `).all(sinceStr);

      return new Response(JSON.stringify({ parties, data: rows }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'pending/count') {
      const { results } = await env.DB.prepare('SELECT COUNT(*) as count FROM pending_tweets WHERE approved = 0').first();
      return new Response(JSON.stringify({ count: results?.count ?? 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'tweets/admin-check') {
      const adminPassword = request.headers.get('x-admin-password');
      if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Invalid admin password' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ isAdmin: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'tweets/preview') {
      const tweetUrl = url.searchParams.get('url');
      if (!tweetUrl) {
        return new Response(JSON.stringify({ error: 'URL required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const existing = await env.DB.prepare('SELECT * FROM tweets WHERE url = ?').first(tweetUrl);
      if (existing) {
        return new Response(JSON.stringify({
          isDuplicate: true,
          existingTweet: existing
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        isDuplicate: false,
        url: tweetUrl,
        content: 'Preview not available - Twitter API not configured',
        authorName: null,
        authorHandle: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: "Endpoint not found",
      path: url.pathname
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }
};