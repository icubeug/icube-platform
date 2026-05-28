'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api, Router, Site, ZeroTouchResult } from '@/lib/api';
import {
  Wifi, WifiOff, Circle, AlertTriangle, RefreshCw, Plus, Server,
  Cpu, Users, Activity, Copy, Check, Download, ChevronRight,
  CheckCircle2, Loader2, X,
} from 'lucide-react';

function timeAgo(d: string | null): string {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function pctColor(pct: number): string {
  if (pct >= 85) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#22c55e';
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 4, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
    </div>
  );
}

function RouterCard({ router, onViewAnalytics }: { router: Router; onViewAnalytics: (id: string) => void }) {
  const cpuPct   = router.cpu_load    || 0;
  const memPct   = router.memory_used || 0;
  const maxUsers = router.max_users   || 200;
  const curUsers = router.active_users || 0;
  const userPct  = maxUsers > 0 ? Math.round((curUsers / maxUsers) * 100) : 0;
  const isOnline = router.vpn_connected || router.status === 'online';
  const isPending = router.status === 'pending';

  return (
    <div style={{
      background: '#131313', border: `1px solid ${curUsers / maxUsers >= 0.85 ? '#7f1d1d' : '#1e1e1e'}`,
      borderRadius: 12, padding: '18px 20px', transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: isPending ? '#f59e0b' : isOnline ? '#22c55e' : '#ef4444',
            boxShadow: isOnline ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
          }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{router.name}</p>
            <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>
              {router.model_name || router.model || 'MikroTik'}
              {router.tier_name && <span style={{ marginLeft: 6, color: '#2563eb' }}>{router.tier_name}</span>}
            </p>
          </div>
        </div>
        {curUsers / maxUsers >= 0.85 && (
          <AlertTriangle size={14} color="#ef4444" />
        )}
      </div>

      {/* VPN address */}
      {router.vpn_address && (
        <div style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', marginBottom: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 5, padding: '3px 7px', display: 'inline-block' }}>
          {router.vpn_address}
        </div>
      )}

      {/* Metrics bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={11} color="#555" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#555', width: 28 }}>CPU</span>
          <MiniBar value={cpuPct} max={100} color={pctColor(cpuPct)} />
          <span style={{ fontSize: 10, color: pctColor(cpuPct), width: 30, textAlign: 'right' }}>{cpuPct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={11} color="#555" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#555', width: 28 }}>RAM</span>
          <MiniBar value={memPct} max={100} color={pctColor(memPct)} />
          <span style={{ fontSize: 10, color: pctColor(memPct), width: 30, textAlign: 'right' }}>{memPct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={11} color="#555" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#555', width: 28 }}>Users</span>
          <MiniBar value={curUsers} max={maxUsers} color={pctColor(userPct)} />
          <span style={{ fontSize: 10, color: pctColor(userPct), width: 46, textAlign: 'right' }}>{curUsers}/{maxUsers}</span>
        </div>
      </div>

      {/* Footer meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          ['Subnet',    router.network_address ? `${router.network_address}/${router.subnet_prefix}` : '—'],
          ['Gateway',   router.gateway_ip || '—'],
          ['WAN IP',    router.wan_ip || '—'],
          ['Last seen', timeAgo(router.last_heartbeat_at)],
        ].map(([k, v]) => (
          <div key={k}>
            <p style={{ fontSize: 9, color: '#444', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
            <p style={{ fontSize: 11, color: '#888', margin: 0, fontFamily: k === 'Subnet' || k === 'WAN IP' ? 'monospace' : 'inherit' }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onViewAnalytics(router.id)} style={{
          flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
          borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer',
        }}>Analytics</button>
        <a href={`/admin/settings/routers/setup?router_id=${router.id}`} style={{
          flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
          borderRadius: 6, padding: '5px 0', fontSize: 11, textDecoration: 'none',
          textAlign: 'center', display: 'block',
        }}>Script</a>
      </div>
    </div>
  );
}

// ── Model detection ───────────────────────────────────────────────────────────
const TIER_DEFS = [
  {
    tier: 1, name: 'SOHO',       color: '#6b7280', vpn: 'l2tp'      as const,
    subnet: '192.168.1.0/24', max_users: 200,
    models: ['rb941','rb931','rb951','rb952','rb750','hap lite','hap mini',
             'hap ac lite','hex lite','hex s','hex','rblhgr'],
  },
  {
    tier: 2, name: 'Medium',     color: '#2563eb', vpn: 'l2tp'      as const,
    subnet: '10.10.0.0/23',   max_users: 400,
    models: ['hap ac','rb962','rbd53','rb2011','map','cap','wap','rb951g','rb1100ah'],
  },
  {
    tier: 3, name: 'Large',      color: '#f59e0b', vpn: 'wireguard' as const,
    subnet: '10.10.0.0/21',   max_users: 1600,
    models: ['rb3011','rb4011','l009','rb1100','ccr1009','rb5009','hap ax'],
  },
  {
    tier: 4, name: 'Enterprise', color: '#f97316', vpn: 'wireguard' as const,
    subnet: '10.10.0.0/19',   max_users: 6000,
    models: ['ccr1016','ccr1036','ccr1072','ccr2004','ccr2116'],
  },
  {
    tier: 5, name: 'Carrier',    color: '#ef4444', vpn: 'wireguard' as const,
    subnet: '10.10.0.0/18',   max_users: 12000,
    models: ['ccr2216'],
  },
] as const;

type TierDef = typeof TIER_DEFS[number];
type DetectResult = { tier: TierDef; vpn: 'wireguard' | 'l2tp'; match: string } | null;

function detectModelInfo(model: string): DetectResult {
  if (!model.trim()) return null;
  const m = model.toLowerCase().trim();

  // Fast prefix checks for v7 models
  if (/ccr2\d/.test(m) || m.startsWith('l009') || m.startsWith('rb4011') || m.startsWith('rb5009')) {
    const tier = TIER_DEFS.find(t => t.tier === (m.startsWith('ccr2216') ? 5 : m.startsWith('rb4011') || m.startsWith('l009') ? 3 : 4))!;
    return { tier, vpn: 'wireguard', match: model.trim() };
  }

  for (const tier of TIER_DEFS) {
    if (tier.models.some(name => m.includes(name))) {
      return { tier, vpn: tier.vpn, match: model.trim() };
    }
  }
  return null; // unknown
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? '#2563eb' : active ? 'rgba(37,99,235,0.2)' : '#1a1a1a',
      border: `2px solid ${done || active ? '#2563eb' : '#2a2a2a'}`,
      fontSize: 11, fontWeight: 700, color: done ? '#fff' : active ? '#2563eb' : '#444',
    }}>
      {done ? <Check size={12} /> : n}
    </div>
  );
}

// ── Zero-Touch Modal (3-step enterprise flow) ─────────────────────────────────
function ZeroTouchModal({ sites, onClose, onDone }: { sites: Site[]; onClose: () => void; onDone: () => void }) {
  const [step,        setStep]       = useState<1 | 2 | 3>(1);
  const [form,        setForm]       = useState({ name: '', model: '', site_id: '', vpn_type: 'wireguard' as 'wireguard' | 'l2tp' });
  const [saving,      setSaving]     = useState(false);
  const [err,         setErr]        = useState('');
  const [ztResult,    setZtResult]   = useState<ZeroTouchResult | null>(null);
  const [cmdCopied,   setCmdCopied]  = useState(false);
  const [polling,     setPolling]    = useState(false);
  const [connected,   setConnected]  = useState<Router | null>(null);
  const [vpnOverride, setVpnOverride] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const detection    = detectModelInfo(form.model);
  const autoDetected = !!detection && !vpnOverride;

  // Auto-select VPN and reset override when model changes
  useEffect(() => {
    if (!form.model.trim()) { setVpnOverride(false); return; }
    const d = detectModelInfo(form.model);
    if (d) {
      setForm(f => ({ ...f, vpn_type: d.vpn }));
      setVpnOverride(false);
    }
  }, [form.model]);

  // Start polling when step 2 begins
  useEffect(() => {
    if (step !== 2 || !ztResult) return;
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.routers.get(ztResult.router.id);
        if (r.status === 'online' || r.vpn_connected) {
          clearInterval(pollRef.current!);
          setPolling(false);
          setConnected(r);
          setStep(3);
          onDone();
        }
      } catch {}
    }, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, ztResult]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Router name is required'); return; }
    setSaving(true); setErr('');
    try {
      const res = await api.routers.zeroTouch({
        name: form.name.trim(), model: form.model || undefined,
        site_id: form.site_id || undefined, vpn_type: form.vpn_type,
      });
      setZtResult(res);
      setStep(2);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  function copyCmd() {
    if (!ztResult) return;
    navigator.clipboard.writeText(ztResult.install_command);
    setCmdCopied(true);
    setTimeout(() => setCmdCopied(false), 2500);
  }

  function downloadRsc() {
    if (!ztResult) return;
    const blob = new Blob([ztResult.script], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `icube-setup-${form.name.replace(/\s+/g,'-')}.rsc`; a.click();
    URL.revokeObjectURL(url);
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };

  const STEP_LABELS = ['Configure', 'Install', 'Connected'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
      <div style={{
        background: '#131313', border: '1px solid #222', borderRadius: 16,
        padding: '28px 32px', width: step === 2 ? 620 : 440,
        maxWidth: '96vw', maxHeight: '92vh', overflow: 'auto',
        transition: 'width 0.3s',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Add Router</p>
            <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>Zero-Touch Provisioning</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <StepDot n={n} active={step === n} done={step > n} />
                  <span style={{ fontSize: 9, color: step === n ? '#2563eb' : step > n ? '#555' : '#333', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: step > n ? '#2563eb' : '#1e1e1e', margin: '0 6px 16px', transition: 'background 0.3s' }} />}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Form ── */}
        {step === 1 && (
          <form onSubmit={generate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Router Name *</label>
              <input style={inp} placeholder="e.g. Kireka Main" autoFocus
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {/* Model field */}
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>MikroTik Model</label>
              <div style={{ position: 'relative' }}>
                <input style={inp} placeholder="e.g. RB4011, L009, hAP ac²"
                  value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                {detection && (
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: `${detection.tier.color}18`,
                    border: `1px solid ${detection.tier.color}40`,
                    color: detection.tier.color,
                  }}>
                    T{detection.tier.tier} {detection.tier.name}
                  </span>
                )}
              </div>

              {/* Detection result */}
              {form.model.trim() && (
                <div style={{ marginTop: 7 }}>
                  {detection ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <p style={{ fontSize: 12, color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={12} />
                        <span>
                          <strong>{form.model.trim()}</strong> detected —{' '}
                          <span style={{ color: detection.tier.color }}>Tier {detection.tier.tier} {detection.tier.name}</span>
                          {' — '}
                          <span style={{ color: detection.vpn === 'wireguard' ? '#60a5fa' : '#fcd34d' }}>
                            {detection.vpn === 'wireguard' ? 'WireGuard (RouterOS v7+)' : 'L2TP/IPsec (RouterOS v6)'}
                          </span>
                        </span>
                      </p>
                      <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                        Subnet: <span style={{ color: '#888', fontFamily: 'monospace' }}>{detection.tier.subnet}</span>
                        {' · '}Max <span style={{ color: '#888' }}>{detection.tier.max_users.toLocaleString()} users</span>
                      </p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                      Model not recognized — defaulting to WireGuard
                    </p>
                  )}
                </div>
              )}
              {!form.model.trim() && (
                <p style={{ fontSize: 11, color: '#444', margin: '4px 0 0' }}>Auto-detects tier, subnet size, VPN protocol and capacity</p>
              )}
            </div>

            {/* VPN Protocol */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>VPN Protocol</label>
                  {autoDetected && (
                    <span style={{ fontSize: 10, color: '#555', display: 'flex', alignItems: 'center', gap: 3 }}>
                      🔒 auto-detected
                    </span>
                  )}
                </div>
                {autoDetected && (
                  <button type="button" onClick={() => setVpnOverride(true)} style={{
                    background: 'none', border: 'none', color: '#2563eb', fontSize: 11,
                    cursor: 'pointer', padding: 0, fontWeight: 500,
                  }}>
                    Override →
                  </button>
                )}
                {vpnOverride && (
                  <button type="button" onClick={() => { setVpnOverride(false); if (detection) setForm(f => ({ ...f, vpn_type: detection.vpn })); }} style={{
                    background: 'none', border: 'none', color: '#555', fontSize: 11,
                    cursor: 'pointer', padding: 0,
                  }}>
                    ← Restore auto
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, opacity: autoDetected ? 0.85 : 1 }}>
                {([
                  { key: 'wireguard', label: 'WireGuard',  sub: 'RouterOS v7+' },
                  { key: 'l2tp',      label: 'L2TP/IPsec', sub: 'RouterOS v6'  },
                ] as { key: 'wireguard' | 'l2tp'; label: string; sub: string }[]).map(({ key, label, sub }) => {
                  const isActive   = form.vpn_type === key;
                  const isDisabled = autoDetected && !isActive;
                  return (
                    <button key={key} type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setForm(f => ({ ...f, vpn_type: key }))}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 12,
                        cursor: isDisabled ? 'not-allowed' : 'pointer', fontWeight: 600,
                        background: isActive ? 'rgba(37,99,235,0.15)' : '#0f0f0f',
                        border: `1px solid ${isActive ? '#2563eb' : '#2a2a2a'}`,
                        color: isActive ? '#60a5fa' : '#555',
                        opacity: isDisabled ? 0.4 : 1,
                        position: 'relative',
                      }}>
                      {label}<br /><span style={{ fontSize: 10, fontWeight: 400 }}>{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Site</label>
              <select style={{ ...inp, color: form.site_id ? '#fff' : '#555' }} value={form.site_id}
                onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                <option value="">— No site assigned —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {err && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{err}</p>}

            <button type="submit" disabled={saving} style={{
              background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8,
              padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: saving ? 0.75 : 1, marginTop: 4,
            }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Generating credentials…</> : <>Generate Setup Script <ChevronRight size={14} /></>}
            </button>
          </form>
        )}

        {/* ── STEP 2: Install command + status polling ── */}
        {step === 2 && ztResult && (
          <div>
            {/* Instruction */}
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', margin: '0 0 4px' }}>Paste this ONE command into your MikroTik terminal</p>
              <p style={{ fontSize: 12, color: '#555', margin: 0 }}>New Terminal → Winbox or SSH. The router configures itself automatically.</p>
            </div>

            {/* The single command */}
            <div style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: 9, padding: '14px 16px', marginBottom: 12, fontFamily: 'monospace', fontSize: 11, color: '#a3e635', lineHeight: 1.7, wordBreak: 'break-all' }}>
              {ztResult.install_command}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={copyCmd} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: cmdCopied ? 'rgba(37,99,235,0.15)' : '#1e1e1e',
                border: `1px solid ${cmdCopied ? '#2563eb' : '#2a2a2a'}`,
                color: cmdCopied ? '#2563eb' : '#aaa', borderRadius: 8,
                padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                {cmdCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Command</>}
              </button>
              <button onClick={downloadRsc} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#888',
                borderRadius: 8, padding: '9px 14px', fontSize: 12, cursor: 'pointer',
              }}>
                <Download size={13} /> Download .rsc
              </button>
            </div>

            {/* Status polling */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 9, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {polling ? (
                  <>
                    <Loader2 size={16} color="#f59e0b" className="animate-spin" />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>Waiting for router to connect…</p>
                      <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>Checking every 10 seconds. Router will appear within 60s of running the command.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Loader2 size={16} color="#555" />
                    <p style={{ fontSize: 13, color: '#555', margin: 0 }}>Run the command above to start the connection check.</p>
                  </>
                )}
              </div>
            </div>

            {/* Router config details */}
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                ['VPN Port',  String(ztResult.config.vpn_port)],
                ['Tier',      ztResult.config.tier],
                ['Max Users', String(ztResult.config.max_users)],
                ['Network',   ztResult.config.network],
                ['Gateway',   ztResult.config.gateway],
                ['VPN IP',    ztResult.router.wireguard_peer_ip || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 7, padding: '8px 10px' }}>
                  <p style={{ fontSize: 9, color: '#444', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
                  <p style={{ fontSize: 11, color: '#888', margin: 0, fontFamily: 'monospace' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Connected ── */}
        {step === 3 && connected && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color="#22c55e" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
              {connected.name} is online!
            </p>
            <p style={{ fontSize: 12, color: '#555', margin: '0 0 22px' }}>Router registered and VPN tunnel established.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'left', marginBottom: 22 }}>
              {[
                ['Model',   connected.model_name || form.model || 'MikroTik'],
                ['Tier',    connected.tier_name  || '—'],
                ['VPN',     connected.vpn_address || '—'],
                ['Subnet',  connected.network_address ? `${connected.network_address}/${connected.subnet_prefix}` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 9, color: '#555', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
                  <p style={{ fontSize: 12, color: '#aaa', margin: 0, fontFamily: 'monospace' }}>{v}</p>
                </div>
              ))}
            </div>

            <a href={`/admin/router/${connected.id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#2563eb', color: '#fff', borderRadius: 8, padding: '11px 0',
              fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 8,
            }}>
              View Router Analytics <ChevronRight size={14} />
            </a>
            <button onClick={onClose} style={{
              width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
              borderRadius: 8, padding: '10px 0', fontSize: 12, cursor: 'pointer',
            }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RouterMonitoringPage() {
  const [routers,       setRouters]       = useState<Router[]>([]);
  const [sites,         setSites]         = useState<Site[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [showZeroTouch, setShowZeroTouch] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.routers.list(), api.sites.list()]);
      setRouters(r); setSites(s);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  function viewAnalytics(id: string) {
    window.location.href = `/admin/router/${id}`;
  }

  const online     = routers.filter(r => r.vpn_connected || r.status === 'online').length;
  const offline    = routers.filter(r => !r.vpn_connected && r.status !== 'pending').length;
  const totalUsers = routers.reduce((s, r) => s + (r.active_users || 0), 0);
  const totalCap   = routers.reduce((s, r) => s + (r.max_users || 200), 0);
  const avgCpu     = routers.length ? Math.round(routers.reduce((s, r) => s + (r.cpu_load || 0), 0) / routers.length) : 0;
  const warnings   = routers.filter(r => (r.active_users || 0) / (r.max_users || 200) >= 0.85);

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Router Monitoring</h1>
          <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>Auto-refreshes every 30s</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#131313', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowZeroTouch(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Add Router
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',       value: routers.length,           color: '#aaa'     },
          { label: 'Online',      value: online,                   color: '#22c55e'  },
          { label: 'Offline',     value: offline,                  color: '#f87171'  },
          { label: 'Active Users',value: totalUsers,               color: '#2563eb'  },
          { label: 'Avg CPU',     value: `${avgCpu}%`,             color: pctColor(avgCpu) },
        ].map(s => (
          <div key={s.label} style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#555', margin: '3px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Capacity warnings */}
      {warnings.map(r => (
        <div key={r.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#f87171',
        }}>
          <AlertTriangle size={14} />
          <span>
            <strong>{r.name}</strong> is at{' '}
            <strong>{Math.round((r.active_users || 0) / (r.max_users || 200) * 100)}% capacity</strong>
            {' '}({r.active_users}/{r.max_users} users). Consider adding another router.
          </span>
        </div>
      ))}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 20, height: 20, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : routers.length === 0 ? (
        <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '64px 24px', textAlign: 'center' }}>
          <Server size={40} color="#333" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#555', margin: '0 0 16px' }}>No routers yet. Add your first router with zero-touch setup.</p>
          <button onClick={() => setShowZeroTouch(true)} style={{ background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Add Router
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {routers.map(r => (
            <RouterCard key={r.id} router={r} onViewAnalytics={viewAnalytics} />
          ))}
        </div>
      )}

      {/* Zero-touch modal */}
      {showZeroTouch && (
        <ZeroTouchModal
          sites={sites}
          onClose={() => setShowZeroTouch(false)}
          onDone={load}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
