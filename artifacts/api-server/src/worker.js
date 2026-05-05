export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const apiKey = request.headers.get('x-api-key');

    // API Key protection
    if (apiKey !== env.API_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password, x-api-key',
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

    // API Routes
    if (url.pathname === '/api/parties') {
      // Database not connected yet
      return new Response(JSON.stringify({ 
        message: "Database not configured. Create D1 database."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      error: "API endpoint not found",
      path: url.pathname
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }
};