// src/routes/ai.routes.js
// ISP AI Assistant — HTTP route layer
// Mount at: POST /api/v1/ai/query

const express = require('express');
const router = express.Router();
const { buildSystemPrompt } = require('../services/ai.context');
const { streamAIResponse } = require('../services/ai.service');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/v1/ai/query
 * Body: { message: string, history?: [{role, content}] }
 * Returns: streaming text/event-stream OR JSON
 *
 * Use ?stream=true for SSE streaming (recommended for dashboard).
 */
router.post('/query', requireAuth, async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // Fetch live network snapshot from DB + Redis (injected into system prompt)
    const systemPrompt = await buildSystemPrompt(req.db, req.redis);

    const messages = [
      ...history.slice(-10), // Keep last 10 turns for context window efficiency
      { role: 'user', content: message.trim() },
    ];

    const wantsStream = req.query.stream === 'true';

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

      await streamAIResponse({ systemPrompt, messages, res });
    } else {
      const reply = await streamAIResponse({ systemPrompt, messages });
      res.json({ reply, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[AI route error]', err.message);
    res.status(500).json({ error: 'AI service unavailable. Please retry.' });
  }
});

module.exports = router;
