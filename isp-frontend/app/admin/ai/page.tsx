'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Send, Plus, MessageSquare, Loader, RefreshCw, Copy, Check, Trash2 } from 'lucide-react';
import { apiCall } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: string;
}

interface Conversation {
  id:            string;
  title:         string | null;
  message_count: number;
  updated_at:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2); }
function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Simple markdown renderer ───────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <div key={i} style={{ position: 'relative', marginBottom: 12 }}>
          {lang && <div style={{ fontSize: 11, color: '#888', padding: '6px 12px 0', fontFamily: 'monospace' }}>{lang}</div>}
          <pre style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 13, overflowX: 'auto', margin: 0, color: '#a3e635', fontFamily: '"Fira Code", Menlo, monospace', lineHeight: 1.6 }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Heading
    if (line.startsWith('### ')) {
      result.push(<p key={i} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '14px 0 6px' }}>{inlineMarkdown(line.slice(4))}</p>);
    } else if (line.startsWith('## ')) {
      result.push(<p key={i} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>{inlineMarkdown(line.slice(3))}</p>);
    } else if (line.startsWith('# ')) {
      result.push(<p key={i} style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>{inlineMarkdown(line.slice(2))}</p>);
    // List item
    } else if (line.match(/^[-*•] /)) {
      result.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }}>•</span>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{inlineMarkdown(line.replace(/^[-*•] /, ''))}</span>
        </div>
      );
    // Numbered list
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      result.push(
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
          <span style={{ color: '#2563eb', flexShrink: 0, fontWeight: 700, fontSize: 13, minWidth: 18 }}>{num}.</span>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{inlineMarkdown(line.replace(/^\d+\. /, ''))}</span>
        </div>
      );
    // Blank line
    } else if (line.trim() === '') {
      result.push(<div key={i} style={{ height: 6 }} />);
    // Normal paragraph
    } else {
      result.push(<p key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.7 }}>{inlineMarkdown(line)}</p>);
    }
    i++;
  }
  return result;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} style={{ background: 'var(--code-bg)', color: '#a3e635', padding: '1px 6px', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// ── Dot loading animation ─────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#2563eb',
          animation: `dotBounce 1.2s ease-in-out infinite`,
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes dotBounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, streaming }: { msg: Message; streaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  function copy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 20,
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isUser ? '#2563eb' : 'var(--bg-hover)',
        border: `1px solid ${isUser ? '#2563eb' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: isUser ? '#fff' : 'var(--text-secondary)',
      }}>
        {isUser ? 'U' : <Sparkles size={14} color="#2563eb" />}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '78%', minWidth: 40 }}>
        <div style={{
          background: isUser ? '#2563eb' : 'var(--bg-card)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: isUser ? '12px 16px' : '14px 18px',
        }}>
          {streaming && msg.content === '' ? (
            <ThinkingDots />
          ) : isUser ? (
            <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          ) : (
            <div>{renderMarkdown(msg.content)}{streaming && <span style={{ display: 'inline-block', width: 2, height: 14, background: '#2563eb', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(msg.timestamp)}</span>
          {!isUser && !streaming && (
            <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
              {copied ? <Check size={11} color="#22c55e" /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTED = [
  'How is my business performing this month?',
  'What packages should I offer for a school hotspot?',
  'Why might customers be disconnecting frequently?',
  'What\'s the best pricing for daily vouchers in Uganda?',
  'How do I troubleshoot a MikroTik router that\'s offline?',
  'How can I increase my revenue this month?',
  'Generate a sales report for this week',
  'How do I set up a new site?',
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AIAssistantPage() {
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState('');
  const [streaming,     setStreaming]      = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convId,        setConvId]        = useState<string | null>(null);
  const [error,         setError]         = useState('');

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await apiCall('/ai/conversations');
      const d = await res.json();
      if (Array.isArray(d)) setConversations(d);
    } catch {}
  }

  async function loadConversation(id: string) {
    try {
      const res = await apiCall(`/ai/conversations/${id}`);
      const d = await res.json();
      if (d.messages) {
        setMessages(Array.isArray(d.messages) ? d.messages : []);
        setConvId(id);
      }
    } catch {}
  }

  async function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setConvId(null);
    setInput('');
    setError('');
    textareaRef.current?.focus();
  }

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    setInput('');
    setError('');

    const userMsg: Message = { id: uid(), role: 'user', content, timestamp: new Date().toISOString() };
    const asstMsg: Message = { id: uid(), role: 'assistant', content: '', timestamp: new Date().toISOString() };

    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, asstMsg]);
    setStreaming(true);

    // Create conversation on first message
    let cid = convId;
    if (!cid) {
      try {
        const res = await apiCall('/ai/conversations', {
          method: 'POST',
          body: JSON.stringify({ title: content.slice(0, 60), messages: [userMsg] }),
        });
        const d = await res.json();
        cid = d.id;
        setConvId(cid);
        loadConversations();
      } catch {}
    } else {
      // Append user message to existing conversation
      apiCall(`/ai/conversations/${cid}`, {
        method: 'PATCH',
        body: JSON.stringify({ messages: [userMsg] }),
      }).catch(() => {});
    }

    // Stream AI response
    abortRef.current = new AbortController();
    try {
      const res = await apiCall('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...updatedMessages].map(m => ({ role: m.role, content: m.content })),
          conversation_id: cid,
        }),
        signal: abortRef.current.signal,
      } as RequestInit);

      if (!res.ok || !res.body) {
        throw new Error('AI service unavailable');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages(prev => prev.map(m =>
                m.id === asstMsg.id ? { ...m, content: fullText } : m
              ));
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch {}
        }
      }

      // Update conversation list title/count
      setTimeout(loadConversations, 500);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('AI is unavailable. Please try again.');
        setMessages(prev => prev.filter(m => m.id !== asstMsg.id));
      }
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, convId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={newChat} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#2563eb', border: 'none', color: '#fff', borderRadius: 9,
            padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={15} /> New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', scrollbarWidth: 'none' }}>
          {conversations.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 8px' }}>
              No conversations yet
            </p>
          ) : (
            conversations.map(c => (
              <button key={c.id} onClick={() => loadConversation(c.id)} style={{
                width: '100%', textAlign: 'left', background: convId === c.id ? 'var(--bg-hover)' : 'none',
                border: `1px solid ${convId === c.id ? 'var(--border)' : 'transparent'}`,
                borderRadius: 8, padding: '9px 10px', cursor: 'pointer',
                marginBottom: 2, display: 'block',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                  <MessageSquare size={12} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title || 'New conversation'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, paddingLeft: 19 }}>
                  {fmtDate(c.updated_at)} · {c.message_count ?? 0} messages
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <header style={{
          height: 56, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 24px',
          background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={17} color="#2563eb" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>AI Assistant</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(37,99,235,0.15)', color: '#2563eb', borderRadius: 4, padding: '2px 7px', letterSpacing: '0.04em' }}>BETA</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Powered by Claude · Knows your business</p>
            </div>
          </div>
          {!isEmpty && (
            <button onClick={newChat} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
              borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              <Plus size={13} /> New Chat
            </button>
          )}
        </header>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', scrollbarWidth: 'thin' }}>

          {isEmpty ? (
            /* Empty state */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Sparkles size={30} color="#2563eb" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                How can I help you today?
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 32px', textAlign: 'center', maxWidth: 420 }}>
                Ask me anything about your network, revenue, customers, or MikroTik routers. I know your business.
              </p>

              {/* Suggested prompts grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 620 }}>
                {SUGGESTED.map(prompt => (
                  <button key={prompt} onClick={() => send(prompt)} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                    padding: '12px 14px', textAlign: 'left', cursor: 'pointer', fontSize: 13,
                    color: 'var(--text-secondary)', lineHeight: 1.5, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  streaming={streaming && idx === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
            </div>
          )}

          {error && (
            <div style={{ maxWidth: 760, margin: '0 auto 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: 'var(--error-text)', fontSize: 13 }}>
              <RefreshCw size={13} />
              {error}
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto', fontSize: 13 }}>✕</button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', background: 'var(--sidebar-bg)', flexShrink: 0 }}>
          <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your network, vouchers, revenue, customers…"
              rows={3}
              disabled={streaming}
              style={{
                width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '14px 56px 14px 16px', fontSize: 14,
                color: 'var(--text-primary)', outline: 'none', resize: 'none',
                lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.15s',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              style={{
                position: 'absolute', right: 10, bottom: 10,
                width: 36, height: 36, borderRadius: 10,
                background: !input.trim() || streaming ? 'var(--bg-hover)' : '#2563eb',
                border: 'none', cursor: !input.trim() || streaming ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}>
              {streaming
                ? <Loader size={16} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={16} color={!input.trim() ? 'var(--text-tertiary)' : '#fff'} />}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 2px' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ctrl+Enter to send</span>
              <span style={{ fontSize: 11, color: input.length > 3800 ? '#f87171' : 'var(--text-muted)' }}>
                {input.length}/4000
              </span>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
