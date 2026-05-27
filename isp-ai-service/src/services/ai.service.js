// src/services/ai.service.js
// Calls Anthropic API. Supports both streaming (SSE) and single-shot responses.

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Set in .env — never hardcode
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;

/**
 * streamAIResponse
 *
 * If `res` (Express response) is passed → streams SSE to client.
 * If not → returns the full reply string.
 */
async function streamAIResponse({ systemPrompt, messages, res }) {
  if (res) {
    // Streaming mode — pipe SSE events to the HTTP response
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const chunk = event.delta.text;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Non-streaming mode — return full reply
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  return response.content.map(b => b.text || '').join('');
}

module.exports = { streamAIResponse };
