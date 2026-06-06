// src/services/ai.service.js
// Calls OpenAI API. Supports both streaming (SSE) and single-shot responses.

const OpenAI = require('openai');

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 1024);

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function toOpenAIMessages(systemPrompt, messages) {
  return [
    { role: 'developer', content: systemPrompt },
    ...messages
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      }))
      .filter((m) => m.content.trim()),
  ];
}

async function streamAIResponse({ systemPrompt, messages, res }) {
  const openaiMessages = toOpenAIMessages(systemPrompt, messages);

  if (res) {
    const stream = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_TOKENS,
      messages: openaiMessages,
      stream: true,
    });

    for await (const event of stream) {
      const chunk = event.choices?.[0]?.delta?.content;
      if (chunk) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_completion_tokens: MAX_TOKENS,
    messages: openaiMessages,
  });

  return response.choices?.[0]?.message?.content || '';
}

module.exports = { streamAIResponse };
