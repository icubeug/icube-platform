// src/ai/ai.routes.js
// AI assistant endpoint — proxies to the isp-ai-service logic.
// For production, run isp-ai-service as a separate process on port 3001.
// Here we embed the same logic directly for a single-process dev setup.

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an intelligent ISP network assistant for a hotspot management platform.
You help administrators monitor sites, troubleshoot routers, analyze revenue, and manage subscribers.
Be concise and actionable. Format numbers clearly (e.g. UGX 45,000 not 45000).`;

// POST /api/v1/ai/query
// Body: { message: string, history?: [{role, content}] }
router.post('/query', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

  try {
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
        system: SYSTEM_PROMPT,
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
        system: SYSTEM_PROMPT,
        messages,
      });
      res.json({ reply: response.content[0].text, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[AI route error]', err.message);
    res.status(500).json({ error: 'AI service unavailable. Please retry.' });
  }
});

module.exports = router;
