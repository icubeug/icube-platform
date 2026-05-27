'use client';
import { useEffect, useState } from 'react';
import { MessageSquare, ExternalLink } from 'lucide-react';

export default function SuperadminSupportPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    fetch('/api/superadmin/support', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setNotes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Support Hub</h1>
        <p style={{ fontSize: 12, color: '#444', margin: 0 }}>All staff notes across tenants</p>
      </div>

      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 18, height: 18, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : notes.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <MessageSquare size={28} style={{ color: '#222', marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: '#333', margin: 0 }}>No support notes yet</p>
          </div>
        ) : notes.map(n => (
          <div key={n.id} style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={16} style={{ color: '#6366f1' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a href={`/superadmin/tenants/${n.tenant_id}`}
                    style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {n.tenant_name} <ExternalLink size={11} />
                  </a>
                  <span style={{ fontSize: 10, color: '#444' }}>·</span>
                  <span style={{ fontSize: 11, color: '#555' }}>{n.author_name || 'Staff'}</span>
                </div>
                <span style={{ fontSize: 10, color: '#333', flexShrink: 0 }}>
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#aaa', margin: 0, lineHeight: 1.6 }}>{n.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
