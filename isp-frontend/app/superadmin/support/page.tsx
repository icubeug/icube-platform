'use client';
import { useEffect, useState } from 'react';
import { MessageSquare, ExternalLink, RefreshCw, Clock, Building2, Plus, Send } from 'lucide-react';

const BG   = '#050d1f';
const CARD = '#0a1628';
const BD   = '1px solid #1a2540';
const TXT  = '#f1f5f9';
const DIM  = '#475569';
const ROW  = '#111e36';

function timeAgo(d: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function AddNoteModal({ tenantId, tenantName, onClose, onAdded }: any) {
  const [note,    setNote]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true); setError('');
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/support/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: tenantId, note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      onAdded(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#070d1e', border: BD, borderRadius: 14, width: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '18px 22px', borderBottom: BD }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: TXT, margin: 0 }}>Add Support Note</p>
          <p style={{ fontSize: 12, color: DIM, margin: '4px 0 0' }}>{tenantName}</p>
        </div>
        <form onSubmit={submit} style={{ padding: '18px 22px' }}>
          <textarea
            required rows={4} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Enter support note, resolution, or observation…"
            style={{ width: '100%', boxSizing: 'border-box', background: CARD, border: BD, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: TXT, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
          />
          {error && <p style={{ fontSize: 12, color: '#f87171', margin: '8px 0 0' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: BD, color: DIM, borderRadius: 8, padding: '8px 18px', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
              {saving ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperadminSupportPage() {
  const [notes,      setNotes]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [modalTenant, setModalTenant] = useState<{ id: string; name: string } | null>(null);

  async function load() {
    setLoading(true);
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/support', { headers: { Authorization: `Bearer ${token}` } });
      const d   = await res.json();
      setNotes(Array.isArray(d) ? d : []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 28px' }}>
      {showModal && modalTenant && (
        <AddNoteModal
          tenantId={modalTenant.id}
          tenantName={modalTenant.name}
          onClose={() => setShowModal(false)}
          onAdded={load}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: TXT, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Support Hub</h1>
          <p style={{ fontSize: 12, color: DIM, margin: 0 }}>{notes.length} staff notes across all tenants</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ background: 'none', border: BD, color: DIM, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div style={{ background: CARD, border: BD, borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ background: '#070d1e', borderBottom: BD, display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 80px', padding: '10px 18px', gap: 12 }}>
          {['Note', 'Tenant', 'Author', 'Time'].map(h => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : notes.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <MessageSquare size={30} style={{ color: '#1a2540', marginBottom: 10 }} />
            <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>No support notes yet</p>
          </div>
        ) : notes.map((n, i) => (
          <div key={n.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 80px', padding: '13px 18px', gap: 12, borderTop: i === 0 ? 'none' : `1px solid ${ROW}`, alignItems: 'flex-start' }}>
            <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>{n.note}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Building2 size={12} style={{ color: '#334155', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{n.tenant_name || n.tenant_id || '—'}</span>
            </div>
            <span style={{ fontSize: 12, color: DIM }}>{n.author_name || n.created_by || 'Staff'}</span>
            <span style={{ fontSize: 11, color: '#334155' }}>{timeAgo(n.created_at)}</span>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
