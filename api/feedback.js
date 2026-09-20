import postgres from 'postgres';

let sql;
let initialized;

function database() {
  if (!sql) {
    const url = process.env.SUPABASE_DB_URL || process.env.DATA_URL;
    if (!url) return null;
    sql = postgres(url, {
      ssl: process.env.SUPABASE_DB_SSL === 'true' ? 'require' : undefined,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }
  if (!initialized && sql) {
    initialized = sql`create table if not exists island_feedback (
      id serial primary key,
      category text not null,
      content text not null,
      contact text,
      created_at timestamptz not null default now()
    )`;
  }
  return { db: sql, ready: initialized };
}

function reply(res, status, body) {
  res.status(status).json(body);
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    return reply(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = parseBody(req);
    const category = String(body.category || 'suggestion').slice(0, 50);
    const content = String(body.content || '').trim().slice(0, 2000);
    const contact = String(body.contact || '').trim().slice(0, 100);

    if (!content) {
      return reply(res, 400, { error: '请写下你想对小岛说的话。' });
    }

    const dbHandle = database();
    if (dbHandle && dbHandle.db) {
      await dbHandle.ready;
      await dbHandle.db`insert into island_feedback (category, content, contact) values (${category}, ${content}, ${contact})`;
    } else {
      // Log for development / serverless logs
      console.log('[Feedback Received]', { category, content, contact, time: new Date().toISOString() });
    }

    return reply(res, 200, {
      success: true,
      message: '感谢你的反馈，我们会用心让这座小岛更美好！'
    });
  } catch (error) {
    console.error('Feedback error:', error?.message || error);
    return reply(res, 500, { error: '反馈提交暂时遇到一点问题，请稍后重试。' });
  }
}
