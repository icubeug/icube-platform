'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, Router } from '@/lib/api';
import { AlertTriangle, CheckCircle, Copy, Download, Loader2, RefreshCw, Router as RouterIcon, Shield, Terminal } from 'lucide-react';

type Tab = 'status' | 'install' | 'connect';

const API_HOST = 'web.icubeug.net';

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      background: ok ? '#052e16' : '#2a1515',
      border: `1px solid ${ok ? '#166534' : '#7f1d1d'}`,
      color: ok ? '#22c55e' : '#f87171',
      borderRadius: 999,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 700,
    }}>{label}</span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#101418', border: '1px solid #202832', borderRadius: 8, padding: 18 }}>{children}</div>;
}

export default function RemoteAccessPage() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tab, setTab] = useState<Tab>('status');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [rs, creds] = await Promise.all([
        api.routers.list(),
        api.settings.getTenantCredentials().catch(() => null),
      ]);
      setRouters(rs);
      setTenantSlug(creds?.slug || '');
      const requested = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('router_id') : '';
      setSelectedId(current => current || requested || rs[0]?.id || '');
    } catch (e: any) {
      setError(e.message || 'Could not load routers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const router = useMemo(() => routers.find(r => r.id === selectedId) || routers[0], [routers, selectedId]);
  const isConnected = !!(router?.vpn_connected || router?.status === 'online');
  const remoteAddress = router?.wireguard_peer_ip ? `${router.wireguard_peer_ip}:8291` : (router?.vpn_address || 'VPN not configured');
  const installCommand = router?.install_token && router?.bearer_token && tenantSlug
    ? `/tool fetch url="https://${API_HOST}/api/v1/router/${tenantSlug}/scripts/vpn/${router.install_token}" http-header-field="Authorization: Bearer ${router.bearer_token}" dst-path="icube-remote-access.rsc" mode=https; :delay 2s; /import file-name="icube-remote-access.rsc"; :delay 1s; /file remove "icube-remote-access.rsc"`
    : '';

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  }

  function downloadScript() {
    if (!installCommand) return;
    const blob = new Blob([installCommand], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icube-remote-${router?.name || 'router'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function testConnection() {
    if (!router) return;
    setTesting(true);
    setTestMessage('');
    try {
      const res = await api.routers.testConnection(router.id);
      setTestMessage(res.message || (res.ok ? 'Connection successful' : 'Connection failed'));
      await load();
    } catch (e: any) {
      setTestMessage(e.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'install', label: 'Install' },
    { key: 'connect', label: 'Connect' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0b1117', padding: '28px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <RouterIcon size={24} color="#2563eb" />
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, margin: 0, fontWeight: 800 }}>Remote Winbox Access</h1>
            <p style={{ color: '#94a3b8', margin: '3px 0 0', fontSize: 13 }}>{router?.name || 'No router selected'}</p>
          </div>
          <div style={{ flex: 1 }} />
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ background: '#0f1720', border: '1px solid #263241', color: '#fff', borderRadius: 7, padding: '9px 12px', minWidth: 190 }}>
            {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <Badge ok={isConnected} label={isConnected ? 'Connected' : 'Offline'} />
        </div>

        <div style={{ background: '#2a1307', border: '1px solid #9a3412', color: '#fdba74', borderRadius: 8, padding: 14, display: 'flex', gap: 10, marginBottom: 16 }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: 13 }}>Remote access should stay restricted to the iCube VPN subnet. Close public Winbox ports on the router.</span>
        </div>

        {error && <div style={{ color: '#f87171', marginBottom: 14, fontSize: 13 }}>{error}</div>}
        {loading && <Card><Loader2 size={20} className="animate-spin" color="#2563eb" /></Card>}

        {!loading && !router && (
          <Card><p style={{ color: '#94a3b8', margin: 0 }}>No router found. Create a router first to generate remote access.</p></Card>
        )}

        {!loading && router && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, background: '#242424', padding: 4, borderRadius: 7, marginBottom: 16 }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ background: tab === t.key ? '#0b1117' : 'transparent', color: tab === t.key ? '#fff' : '#a3a3a3', border: 'none', borderRadius: 5, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'status' && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield size={18} color={isConnected ? '#22c55e' : '#f59e0b'} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#fff', fontWeight: 800, margin: 0 }}>{isConnected ? 'Remote tunnel online' : 'Remote tunnel not connected'}</p>
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: '4px 0 0' }}>Last seen: {router.last_heartbeat_at ? new Date(router.last_heartbeat_at).toLocaleString() : 'Never'}</p>
                  </div>
                  <button onClick={load} style={{ background: '#111827', border: '1px solid #263241', color: '#d1d5db', borderRadius: 7, padding: '8px 12px', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
                  {[
                    ['Model', router.model_name || router.board_name || 'MikroTik'],
                    ['CPU', router.cpu_load != null ? `${router.cpu_load}%` : '-'],
                    ['Users', String(router.active_users || 0)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#0b1117', border: '1px solid #202832', borderRadius: 7, padding: 12 }}>
                      <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{k}</p>
                      <p style={{ color: '#fff', fontWeight: 700, margin: '4px 0 0' }}>{v}</p>
                    </div>
                  ))}
                </div>
                <button onClick={testConnection} disabled={testing} style={{ marginTop: 16, background: '#111827', border: '1px solid #263241', color: '#fff', borderRadius: 7, padding: '9px 14px', cursor: 'pointer' }}>
                  {testing ? 'Testing...' : 'Test RouterOS API'}
                </button>
                {testMessage && <p style={{ color: '#94a3b8', fontSize: 12, margin: '10px 0 0' }}>{testMessage}</p>}
              </Card>
            )}

            {tab === 'install' && (
              <Card>
                <h2 style={{ color: '#fff', fontSize: 18, margin: '0 0 8px' }}>Automatic Installation</h2>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 14px' }}>Run this in MikroTik Terminal. It installs VPN fallback, allows Winbox from iCube VPN, and registers the router heartbeat.</p>
                <pre style={{ background: '#111827', border: '1px solid #263241', borderRadius: 7, padding: 14, color: '#dbeafe', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, lineHeight: 1.6 }}>{installCommand || 'Install token missing. Regenerate router setup from Routers.'}</pre>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => copy(installCommand, 'install')} disabled={!installCommand} style={{ background: '#2563eb', border: 'none', color: '#fff', borderRadius: 7, padding: '8px 13px', cursor: 'pointer' }}>
                    <Copy size={13} /> {copied === 'install' ? 'Copied' : 'Copy Command'}
                  </button>
                  <button onClick={downloadScript} disabled={!installCommand} style={{ background: '#111827', border: '1px solid #263241', color: '#fff', borderRadius: 7, padding: '8px 13px', cursor: 'pointer' }}>
                    <Download size={13} /> Download
                  </button>
                </div>
              </Card>
            )}

            {tab === 'connect' && (
              <Card>
                <h2 style={{ color: '#fff', fontSize: 18, margin: '0 0 12px' }}>Winbox Desktop Connection</h2>
                <div style={{ background: '#172033', border: '1px dashed #334155', borderRadius: 7, padding: 14, color: '#fff', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{remoteAddress}</span>
                  <button onClick={() => copy(remoteAddress, 'addr')} style={{ background: '#fff', color: '#111827', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                    {copied === 'addr' ? 'Copied' : <Copy size={14} />}
                  </button>
                </div>
                <ol style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.8, marginTop: 16 }}>
                  <li>Open Winbox on your computer.</li>
                  <li>Use the address above in the Connect To field.</li>
                  <li>Login with the existing MikroTik username and password.</li>
                </ol>
                <p style={{ color: '#fbbf24', fontSize: 12, margin: '12px 0 0' }}>
                  For public host:port style access like ZenFi, the VPS still needs TCP port forwarding from the public edge to each router VPN IP on port 8291.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
