export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/healthz') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // API Routes - return simple response for now
    if (url.pathname === '/api/parties') {
      // Note: Turso not connected yet - need D1 or external DB
      return new Response(JSON.stringify({ 
        message: "API working but database not connected. Set up D1 database.",
        tables: ['parties', 'tweets', 'politicians', 'events', 'issues', 'schemes', 'votes']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ 
        error: "Database not configured. Create a D1 database in Cloudflare dashboard.",
        path: url.pathname
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    return new Response('TRACK API - Configure D1 database to use', { 
      headers: { ...corsHeaders } 
    });
  }
};