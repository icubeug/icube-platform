// src/ai/ai.routes.js
// Body: { message: string, history?: [{role, content}] }

const express = require('express');
const router  = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Auth helper — extract tenant_id + admin_id from Bearer token ──────────────
function extractAuth(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return {};
  try {
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'dev-jwt-secret');
    return { tenant_id: payload.tenant_id, admin_id: payload.admin_id };
  } catch { return {}; }
}

// ── Build rich system prompt with live tenant context ─────────────────────────
async function buildSystemPrompt(db, tenant_id) {
  const base = `You are an intelligent assistant for an ISP and WiFi hotspot business in Uganda using the iCube platform.

Uganda context:
- Currency: UGX (Ugandan Shillings). Always format numbers with commas (1,000,000 UGX).
- Common mobile money: MTN MoMo, Airtel Money
- Typical hotspot locations: hotels, restaurants, schools, markets, apartments
- Common MikroTik models: hAP lite, RB951, L009, hEX, RB4011

You help with:
1. Network troubleshooting and advice
2. Business insights and revenue analysis
3. Package pricing recommendations for the Uganda market
4. Customer management advice
5. MikroTik router configuration help
6. Voucher and sales strategy
7. Explaining iCube platform features

Always respond in a helpful, professional tone. Keep responses concise but complete. Use bullet points for lists.`;

  if (!tenant_id) return base;

  try {
    const [tenantRow]  = await db.query(`SELECT name, plan, max_sites FROM tenants WHERE id=$1`, [tenant_id]);
    const [siteCount]  = await db.query(`SELECT COUNT(*) AS n FROM sites WHERE tenant_id=$1`, [tenant_id]);
    const [routerStats]= await db.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN vpn_connected THEN 1 ELSE 0 END) AS online FROM routers WHERE tenant_id=$1`, [tenant_id]);
    const [pkgCount]   = await db.query(`SELECT COUNT(*) AS n FROM packages WHERE tenant_id=$1`, [tenant_id]);
    const [todayStats] = await db.query(`
      SELECT COUNT(*) AS vouchers_today,
             COALESCE(SUM(amount_ugx),0) AS revenue_today
      FROM payments
      WHERE tenant_id=$1 AND created_at::date = CURRENT_DATE AND status='completed'
    `, [tenant_id]).catch(() => [{ vouchers_today: 0, revenue_today: 0 }]);
    const [activeUsers]= await db.query(`SELECT COUNT(DISTINCT ra.username) AS n FROM radacct ra JOIN routers r ON r.ip_address = ra.nasipaddress WHERE ra.acctstoptime IS NULL AND r.tenant_id=$1`, [tenant_id]).catch(() => [{ n: 0 }]);

    return `You are an intelligent assistant for ${tenantRow?.name || 'this business'}, an ISP and WiFi hotspot business in Uganda using the iCube platform.

Current business data (live):
- Plan: ${tenantRow?.plan || 'free'}
- Active sites: ${siteCount?.n || 0} (limit: ${tenantRow?.max_sites || 5})
- Routers: ${routerStats?.online || 0} online / ${routerStats?.total || 0} total
- Total packages: ${pkgCount?.n || 0}
- Vouchers sold today: ${todayStats?.vouchers_today || 0}
- Revenue today: UGX ${Number(todayStats?.revenue_today || 0).toLocaleString()}
- Customers connected right now: ${activeUsers?.n || 0}

${base}`;
  } catch {
    return base;
  }
}

// ── POST /api/v1/ai/query — legacy simple endpoint ────────────────────────────
router.post('/query', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

  const { tenant_id } = extractAuth(req);
  const db = req.app.locals.db;

  try {
    const systemPrompt = await buildSystemPrompt(db, tenant_id);
    const messages = [
      ...history.slice(-10),
      { role: 'user', content: message.trim() },
    ];

    const wantsStream = req.query.stream === 'true';

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const stream = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });
      res.json({ reply: response.content[0].text, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[AI /query error]', err.message);
    res.status(500).json({ error: 'AI service unavailable. Please retry.' });
  }
});

// ── POST /api/v1/ai/chat — streaming chat with tenant context ─────────────────
router.post('/chat', async (req, res) => {
  const { messages = [], conversation_id } = req.body;
  if (!messages.length) return res.status(400).json({ error: 'messages required' });

  const { tenant_id, admin_id } = extractAuth(req);
  const db = req.app.locals.db;

  try {
    const systemPrompt = await buildSystemPrompt(db, tenant_id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullText = '';

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        fullText += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

    // Persist full reply to conversation asynchronously
    if (conversation_id && tenant_id && fullText) {
      const assistantMsg = { role: 'assistant', content: fullText, timestamp: new Date().toISOString() };
      db.query(
        `UPDATE ai_conversations SET messages = messages || $1::jsonb, updated_at = NOW() WHERE id=$2 AND tenant_id=$3`,
        [JSON.stringify([assistantMsg]), conversation_id, tenant_id]
      ).catch(() => {});
    }
  } catch (err) {
    console.error('[AI /chat error]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI service unavailable. Please retry.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
      res.end();
    }
  }
});

// ── GET /api/v1/ai/conversations — list tenant conversations ──────────────────
router.get('/conversations', async (req, res) => {
  const { tenant_id } = extractAuth(req);
  if (!tenant_id) return res.json([]);
  const db = req.app.locals.db;
  try {
    const rows = await db.query(
      `SELECT id, title, created_at, updated_at,
              jsonb_array_length(messages) AS message_count
       FROM ai_conversations WHERE tenant_id=$1
       ORDER BY updated_at DESC LIMIT 20`,
      [tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

// ── GET /api/v1/ai/conversations/:id ─────────────────────────────────────────
router.get('/conversations/:id', async (req, res) => {
  const { tenant_id } = extractAuth(req);
  if (!tenant_id) return res.status(401).json({ error: 'Unauthorized' });
  const db = req.app.locals.db;
  try {
    const [row] = await db.query(
      `SELECT * FROM ai_conversations WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, tenant_id]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/v1/ai/conversations — create conversation + append user message ─
router.post('/conversations', async (req, res) => {
  const { tenant_id, admin_id } = extractAuth(req);
  if (!tenant_id) return res.status(401).json({ error: 'Unauthorized' });
  const { title, messages = [] } = req.body;
  const db = req.app.locals.db;
  try {
    const [row] = await db.query(
      `INSERT INTO ai_conversations (tenant_id, admin_id, title, messages)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [tenant_id, admin_id || null, title || null, JSON.stringify(messages)]
    );
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/v1/ai/conversations/:id — append messages ─────────────────────
router.patch('/conversations/:id', async (req, res) => {
  const { tenant_id } = extractAuth(req);
  if (!tenant_id) return res.status(401).json({ error: 'Unauthorized' });
  const { messages, title } = req.body;
  const db = req.app.locals.db;
  try {
    const sets = ['updated_at = NOW()'];
    const params = [];
    if (messages?.length) {
      sets.push(`messages = messages || $${params.length + 1}::jsonb`);
      params.push(JSON.stringify(messages));
    }
    if (title) {
      sets.push(`title = $${params.length + 1}`);
      params.push(title);
    }
    params.push(req.params.id, tenant_id);
    const [row] = await db.query(
      `UPDATE ai_conversations SET ${sets.join(',')} WHERE id=$${params.length - 1} AND tenant_id=$${params.length} RETURNING *`,
      params
    );
    res.json(row || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
