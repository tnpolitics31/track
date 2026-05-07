import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  ADMIN_PASSWORD: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin) => origin,
}));

app.get('/', (c) => c.text('TRACK API'));
app.get('/healthz', (c) => c.json({ status: 'ok' }));

// Parties
app.get('/api/parties', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM parties ORDER BY id').all();
    return c.json(result.results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Tweets
app.get('/api/tweets', async (c) => {
  try {
    const limit = c.req.query('limit') || '50';
    const result = await c.env.DB.prepare(`SELECT * FROM tweets ORDER BY created_at DESC LIMIT ${limit}`).all();
    return c.json(result.results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Politicians  
app.get('/api/politicians', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM politicians ORDER BY id').all();
    return c.json(result.results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Events
app.get('/api/events', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM events ORDER BY date DESC').all();
    return c.json(result.results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Issues
app.get('/api/issues', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM issues ORDER BY created_at DESC').all();
    return c.json(result.results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Schemes
app.get('/api/schemes', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM schemes ORDER BY id').all();
    return c.json(result.results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Votes
app.get('/api/votes', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM votes ORDER BY id').all();
    return c.json(result.results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', async (c) => {
  try {
    const tweets = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tweets').first();
    const politicians = await c.env.DB.prepare('SELECT COUNT(*) as count FROM politicians').first();
    const parties = await c.env.DB.prepare('SELECT COUNT(*) as count FROM parties').first();
    const issues = await c.env.DB.prepare('SELECT COUNT(*) as count FROM issues').first();
    return c.json({
      tweets: tweets?.count || 0,
      politicians: politicians?.count || 0,
      parties: parties?.count || 0,
      issues: issues?.count || 0,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Admin routes
app.post('/api/parties', async (c) => {
  const password = c.req.header('x-admin-password');
  if (password !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const body = await c.req.json();
    const result = await c.env.DB.prepare(
      'INSERT INTO parties (name, short_name, color, description) VALUES (?, ?, ?, ?)'
    ).bind(body.name, body.shortName, body.color || '#6b7280', body.description || null).run();
    return c.json({ id: result.meta.last_row_id, ...body }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

export default app;