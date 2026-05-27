'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Router as RouterIcon, Wifi, Shield, Settings, Terminal, CheckCircle,
  Copy, Download, Printer, ChevronRight, ChevronLeft, Loader,
  AlertCircle, Eye, EyeOff, Circle, Search, X, AlertTriangle, Info,
} from 'lucide-react';
import { TENANT_ID } from '@/lib/api';

// ── MikroTik model data ────────────────────────────────────────────────────────
const TIER_COLORS = ['#6b7280','#1D9E75','#f59e0b','#f97316','#ef4444'];
const TIER_LABELS = ['','SOHO','Medium','Large','Enterprise','Carrier'];

const TIERS = [
  {
    id: 'soho', tier: 1,
    name: 'SOHO / Small Office',
    subnet: '192.168.1.0/24', network: '192.168.1.0', prefix: 24,
    gateway: '192.168.1.1', poolStart: '192.168.1.2', poolEnd: '192.168.1.254',
    mask: '255.255.255.0', totalIPs: 254, maxUsers: 200,
    models: [
      { name: 'hAP lite',        sku: 'RB941-2nD' },
      { name: 'hAP lite TC',     sku: 'RB941-2nD-TC' },
      { name: 'hAP mini',        sku: 'RB931-2nD' },
      { name: 'hAP',             sku: 'RB951Ui-2nD' },
      { name: 'hAP ac lite',     sku: 'RB952Ui-5ac2nD' },
      { name: 'hAP ac lite TC',  sku: 'RB952Ui-5ac2nD-TC' },
      { name: 'hEX lite',        sku: 'RB750r2' },
      { name: 'hEX',             sku: 'RB750Gr3' },
      { name: 'hEX S',           sku: 'RB760iGS' },
    ],
  },
  {
    id: 'medium', tier: 2,
    name: 'Medium Hotspot',
    subnet: '10.10.0.0/23', network: '10.10.0.0', prefix: 23,
    gateway: '10.10.0.1', poolStart: '10.10.0.2', poolEnd: '10.10.1.254',
    mask: '255.255.254.0', totalIPs: 510, maxUsers: 400,
    models: [
      { name: 'hAP ac²',           sku: 'RB962UiGS-5HacT2HnT' },
      { name: 'hAP ac³',           sku: 'RBD53iG-5HacD2HnD' },
      { name: 'RB951G-2HnD',       sku: 'RB951G-2HnD' },
      { name: 'RB2011UiAS-2HnD',   sku: 'RB2011UiAS-2HnD' },
      { name: 'RB2011UiAS-IN',     sku: 'RB2011UiAS-IN' },
      { name: 'RB2011iLS-IN',      sku: 'RB2011iLS-IN' },
      { name: 'RB2011UAS-2HnD-IN', sku: 'RB2011UAS-2HnD-IN' },
      { name: 'mAP',               sku: 'RBmAP2nD' },
      { name: 'mAP lite',          sku: 'RBmAPL-2nD' },
      { name: 'cAP ac',            sku: 'RBcAPGi-5acD2nD' },
      { name: 'cAP lite',          sku: 'RBcAP2nD' },
    ],
  },
  {
    id: 'large', tier: 3,
    name: 'Large Hotspot',
    subnet: '10.10.0.0/21', network: '10.10.0.0', prefix: 21,
    gateway: '10.10.0.1', poolStart: '10.10.0.2', poolEnd: '10.10.7.254',
    mask: '255.255.248.0', totalIPs: 2046, maxUsers: 1600,
    models: [
      { name: 'RB3011UiAS-RM',            sku: 'RB3011UiAS-RM' },
      { name: 'RB4011iGS+RM',             sku: 'RB4011iGS+RM' },
      { name: 'RB4011iGS+5HacQ2HnD-IN',   sku: 'RB4011iGS+5HacQ2HnD-IN' },
      { name: 'L009 (L009UiGS-2HaxD-IN)', sku: 'L009UiGS-2HaxD-IN', is_l009: true },
      { name: 'L009UiGS-RM',              sku: 'L009UiGS-RM',        is_l009: true },
      { name: 'RB1100AHx4 (Dude Edition)',sku: 'RB1100AHx4-DE' },
      { name: 'RB1100Dx4',               sku: 'RB1100Dx4' },
      { name: 'RB1100AHx4',              sku: 'RB1100AHx4' },
      { name: 'CCR1009-7G-1C-1S+',       sku: 'CCR1009-7G-1C-1S+' },
      { name: 'CCR1009-8G-1S-1S+',       sku: 'CCR1009-8G-1S-1S+' },
    ],
  },
  {
    id: 'enterprise', tier: 4,
    name: 'Enterprise / ISP Core',
    subnet: '10.10.0.0/19', network: '10.10.0.0', prefix: 19,
    gateway: '10.10.0.1', poolStart: '10.10.0.2', poolEnd: '10.10.31.254',
    mask: '255.255.224.0', totalIPs: 8190, maxUsers: 6000,
    models: [
      { name: 'CCR1016-12G',          sku: 'CCR1016-12G' },
      { name: 'CCR1016-12S-1S+',      sku: 'CCR1016-12S-1S+' },
      { name: 'CCR1036-8G-2S+',       sku: 'CCR1036-8G-2S+' },
      { name: 'CCR1036-12G-4S',       sku: 'CCR1036-12G-4S' },
      { name: 'CCR1072-1G-8S+',       sku: 'CCR1072-1G-8S+' },
      { name: 'CCR2004-1G-12S+2XS',   sku: 'CCR2004-1G-12S+2XS' },
      { name: 'CCR2004-16G-2S+',      sku: 'CCR2004-16G-2S+' },
      { name: 'CCR2116-12G-4S+',      sku: 'CCR2116-12G-4S+' },
      { name: 'CCR2216-1G-12XS-2XQ',  sku: 'CCR2216-1G-12XS-2XQ' },
    ],
  },
  {
    id: 'carrier', tier: 5,
    name: 'Carrier Grade',
    subnet: '10.10.0.0/18', network: '10.10.0.0', prefix: 18,
    gateway: '10.10.0.1', poolStart: '10.10.0.2', poolEnd: '10.10.63.254',
    mask: '255.255.192.0', totalIPs: 16382, maxUsers: 12000,
    models: [
      { name: 'CCR1072-1G-8S+ (high load)',      sku: 'CCR1072-HL' },
      { name: 'CCR2216-1G-12XS-2XQ (high load)', sku: 'CCR2216-HL' },
      { name: 'Any CCR with 16+ cores',           sku: 'CCR-16PLUS' },
    ],
  },
];

// Flat list of all models for search
const ALL_MODELS = TIERS.flatMap(t => t.models.map(m => ({ ...m, tier: t })));

// ── RFC1918 validator ──────────────────────────────────────────────────────────
function isRFC1918(cidr: string): boolean {
  const [ip] = cidr.split('/');
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  const [a, b] = parts;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function parseCidr(cidr: string) {
  const [net, prefix] = cidr.split('/');
  const p = parseInt(prefix);
  const parts = net.split('.').map(Number);
  if (parts.length !== 4 || isNaN(p) || p < 8 || p > 30) return null;
  return { network: net, prefix: p };
}

// ── Step bar ──────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Router & Model', icon: RouterIcon },
  { id: 2, label: 'Network',        icon: Settings },
  { id: 3, label: 'VPN',            icon: Shield },
  { id: 4, label: 'Script',         icon: Terminal },
  { id: 5, label: 'Done',           icon: CheckCircle },
];

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const done = s.id < current, active = s.id === current;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, opacity: s.id > current ? 0.3 : 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: done ? '#1D9E75' : active ? 'rgba(29,158,117,0.18)' : '#1a1a1a', border: `2px solid ${done || active ? '#1D9E75' : '#222'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                {done ? <CheckCircle size={15} style={{ color: '#fff' }} /> : <s.icon size={14} style={{ color: active ? '#1D9E75' : '#444' }} />}
              </div>
              <span style={{ fontSize: 10, color: active ? '#1D9E75' : done ? '#666' : '#333', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: s.id < current ? '#1D9E75' : '#1e1e1e', margin: '0 6px 18px', transition: 'background 0.3s' }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Tier badge ─────────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: number }) {
  const color = TIER_COLORS[tier] || '#555';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 6, padding: '2px 7px', letterSpacing: '0.04em', flexShrink: 0 }}>
      T{tier} {TIER_LABELS[tier]}
    </span>
  );
}

// ── Model selector ─────────────────────────────────────────────────────────────
function ModelSelector({ value, onChange }: {
  value: (typeof ALL_MODELS)[0] | null;
  onChange: (m: (typeof ALL_MODELS)[0]) => void;
}) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length < 1
    ? ALL_MODELS
    : ALL_MODELS.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.sku.toLowerCase().includes(query.toLowerCase()) ||
        m.tier.name.toLowerCase().includes(query.toLowerCase())
      );

  // Group filtered by tier
  const grouped = TIERS.map(t => ({
    tier: t,
    models: filtered.filter(m => m.tier.id === t.id),
  })).filter(g => g.models.length > 0);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ width: '100%', background: '#111', border: `1px solid ${open ? '#1D9E75' : '#2a2a2a'}`, borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color 0.2s' }}>
        {value ? (
          <>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{value.name}</p>
              <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0', fontFamily: 'monospace' }}>{value.sku}</p>
            </div>
            <TierBadge tier={value.tier.tier} />
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null as any); setQuery(''); }}
              style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <Search size={14} style={{ color: '#444', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#444', flex: 1, textAlign: 'left' }}>Search MikroTik model…</span>
            <ChevronRight size={13} style={{ color: '#333', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#151515', border: '1px solid #2a2a2a', borderRadius: 10, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden', maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
          {/* Search input */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} style={{ color: '#444', flexShrink: 0 }} />
            <input
              autoFocus
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Type model name or SKU…"
              style={{ flex: 1, background: 'none', border: 'none', fontSize: 13, color: '#fff', outline: 'none' }}
            />
            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} /></button>}
          </div>

          {/* Groups */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {grouped.length === 0 && (
              <p style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#444' }}>No models found</p>
            )}
            {grouped.map(({ tier: t, models }) => (
              <div key={t.id}>
                <div style={{ padding: '7px 12px 4px', display: 'flex', alignItems: 'center', gap: 7, position: 'sticky', top: 0, background: '#111', borderBottom: '1px solid #1a1a1a' }}>
                  <TierBadge tier={t.tier} />
                  <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>{t.name}</span>
                  <span style={{ fontSize: 10, color: '#333', marginLeft: 'auto' }}>{t.subnet}</span>
                </div>
                {models.map(m => (
                  <button key={m.sku} type="button"
                    onClick={() => { onChange(m); setOpen(false); setQuery(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: value?.sku === m.sku ? 'rgba(29,158,117,0.1)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                    className="hover:bg-[#1e1e1e]">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: value?.sku === m.sku ? '#1D9E75' : '#ddd' }}>{m.name}</span>
                        {(m as any).is_l009 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.15)', borderRadius: 4, padding: '1px 5px' }}>HW OFFLOAD</span>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{m.sku}</span>
                    </div>
                    {value?.sku === m.sku && <CheckCircle size={13} style={{ color: '#1D9E75', flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Stats footer */}
          <div style={{ padding: '6px 12px', borderTop: '1px solid #1a1a1a', fontSize: 10, color: '#333' }}>
            {ALL_MODELS.length} models across 5 tiers
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tier summary card ─────────────────────────────────────────────────────────
function TierSummaryCard({ tier, expectedUsers, isCustom }: { tier: typeof TIERS[0]; expectedUsers: number; isCustom?: boolean }) {
  const utilPct   = Math.min(100, Math.round((expectedUsers / tier.maxUsers) * 100));
  const indicator = utilPct < 70 ? 'green' : utilPct < 90 ? 'amber' : 'red';
  const indColors = { green: '#1D9E75', amber: '#f59e0b', red: '#ef4444' };
  const indLabel  = { green: 'Capacity adequate', amber: 'Borderline — monitor closely', red: 'May run out of IPs' };

  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <TierBadge tier={tier.tier} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{tier.name}</span>
        {isCustom && <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', borderRadius: 5, padding: '1px 7px', marginLeft: 'auto' }}>Custom subnet</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          ['Subnet',     tier.subnet],
          ['Mask',       tier.mask],
          ['Gateway',    tier.gateway],
          ['IP Pool',    `${tier.poolStart} – ${tier.poolEnd}`],
          ['Total IPs',  tier.totalIPs.toLocaleString()],
          ['Max Users',  tier.maxUsers.toLocaleString()],
        ].map(([k, v]) => (
          <div key={k}>
            <p style={{ fontSize: 10, color: '#555', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
            <p style={{ fontSize: 12, color: '#ccc', margin: 0, fontFamily: 'monospace' }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Capacity indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: `${indColors[indicator]}12`, border: `1px solid ${indColors[indicator]}30`, borderRadius: 7 }}>
        <Circle size={8} style={{ color: indColors[indicator], fill: indColors[indicator], flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: indColors[indicator], fontWeight: 500 }}>{indLabel[indicator]}</span>
        {expectedUsers > 0 && (
          <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>{expectedUsers} / {tier.maxUsers} users</span>
        )}
      </div>
    </div>
  );
}

// ── Copy / Download / Print buttons ───────────────────────────────────────────
function ScriptActions({ script, routerName }: { script: string; routerName: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([script], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `icube-setup-${routerName.replace(/\s+/g, '-').toLowerCase()}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function print() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>iCube Script: ${routerName}</title>
<style>body{background:#0a0a0a;color:#a8ff78;font-family:monospace;font-size:12px;padding:24px;line-height:1.6}pre{white-space:pre-wrap;word-break:break-word}@media print{body{background:white;color:black}}</style>
</head><body><pre>${script.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  }

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    background: active ? 'rgba(29,158,117,0.15)' : '#1a1a1a',
    border: `1px solid ${active ? '#1D9E75' : '#2a2a2a'}`,
    borderRadius: 7, padding: '6px 13px', fontSize: 12,
    color: active ? '#1D9E75' : '#888', cursor: 'pointer', transition: 'all 0.2s',
  });

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={copy}     style={btnStyle(copied)}>{copied ? <CheckCircle size={12} /> : <Copy size={12} />}   {copied ? 'Copied!' : 'Copy'}</button>
      <button onClick={download} style={btnStyle()}>       <Download size={12} />  Download .rsc</button>
      <button onClick={print}    style={btnStyle()}>       <Printer  size={12} />  Print</button>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#444', margin: '5px 0 0', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff',
  outline: 'none', boxSizing: 'border-box',
};

// ── Main wizard (inner) ────────────────────────────────────────────────────────
function RouterSetupWizardInner() {
  const searchParams = useSearchParams();
  const routerIdParam = searchParams.get('router_id') || '';

  const [step,        setStep]        = useState(1);
  const [selectedId,  setSelectedId]  = useState(routerIdParam);
  const [router,      setRouter]      = useState<any>(null);
  const [routers,     setRouters]     = useState<any[]>([]);
  const [selModel,    setSelModel]    = useState<(typeof ALL_MODELS)[0] | null>(null);

  // Network config — pre-filled from tier, overridable
  const [netConfig, setNetConfig] = useState({
    wan_interface:   'ether1',
    lan_interface:   'ether2',
    dns_servers:     '8.8.8.8,8.8.4.4',
    custom_subnet:   '',
    use_custom:      false,
  });
  const [expectedUsers, setExpectedUsers] = useState(0);
  const [subnetError,   setSubnetError]   = useState('');

  const [script,      setScript]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [testResult,  setTestResult]  = useState<any>(null);
  const [testing,     setTesting]     = useState(false);

  // Derived tier from selected model
  const activeTier = selModel?.tier ?? null;

  // Effective network values
  function getEffectiveNet() {
    if (netConfig.use_custom && netConfig.custom_subnet) {
      const parsed = parseCidr(netConfig.custom_subnet);
      if (parsed) {
        const octets = parsed.network.split('.').map(Number);
        const gw = [...octets.slice(0, 3), 1].join('.');
        const poolS = [...octets.slice(0, 3), 2].join('.');
        // Rough pool end based on prefix
        const hostBits = 32 - parsed.prefix;
        const hostCount = Math.pow(2, hostBits) - 2;
        const poolEndNum = (octets[0]*16777216 + octets[1]*65536 + octets[2]*256 + octets[3]) + hostCount;
        const poolEnd = [
          Math.floor(poolEndNum / 16777216) % 256,
          Math.floor(poolEndNum / 65536) % 256,
          Math.floor(poolEndNum / 256) % 256,
          poolEndNum % 256,
        ].join('.');
        return { network_cidr: netConfig.custom_subnet, gateway: gw, pool_start: poolS, pool_end: poolEnd };
      }
    }
    if (activeTier) {
      return {
        network_cidr: activeTier.subnet,
        gateway:      activeTier.gateway,
        pool_start:   activeTier.poolStart,
        pool_end:     activeTier.poolEnd,
      };
    }
    return {
      network_cidr: '192.168.88.0/24',
      gateway:      '192.168.88.1',
      pool_start:   '192.168.88.2',
      pool_end:     '192.168.88.254',
    };
  }

  function validateCustomSubnet(val: string) {
    if (!val) { setSubnetError(''); return; }
    const parsed = parseCidr(val);
    if (!parsed) { setSubnetError('Invalid CIDR format (e.g. 192.168.10.0/24)'); return; }
    if (!isRFC1918(val)) { setSubnetError('Must be an RFC1918 private range (10.x, 172.16-31.x, 192.168.x)'); return; }
    setSubnetError('');
  }

  // Load tenant routers on mount
  useEffect(() => {
    fetch('/api/v1/settings/routers', { headers: { 'X-Tenant-ID': TENANT_ID } })
      .then(r => r.json())
      .then(d => setRouters(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load selected router
  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/v1/routers/${selectedId}/setup`, { headers: { 'X-Tenant-ID': TENANT_ID } })
      .then(r => r.json())
      .then(d => {
        setRouter(d.router);
        if (d.config?.wan_interface) {
          setNetConfig(c => ({
            ...c,
            wan_interface: d.config.wan_interface,
            lan_interface: d.config.lan_interface,
            dns_servers:   d.config.dns_servers || c.dns_servers,
          }));
        }
        if (d.script) setScript(d.script);
      })
      .catch(() => {});
  }, [selectedId]);

  async function generateScript() {
    if (!selectedId || !selModel) return;
    setLoading(true); setError('');
    const net = getEffectiveNet();
    try {
      const res = await fetch(`/api/v1/routers/${selectedId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT_ID },
        body: JSON.stringify({
          wan_interface:  netConfig.wan_interface,
          lan_interface:  netConfig.lan_interface,
          hotspot_network: net.network_cidr,
          dns_servers:    netConfig.dns_servers,
          gateway:        net.gateway,
          pool_start:     net.pool_start,
          pool_end:       net.pool_end,
          network_cidr:   net.network_cidr,
          model: {
            name:    selModel.name,
            sku:     selModel.sku,
            is_l009: (selModel as any).is_l009 || false,
          },
          tier: activeTier ? {
            name:     activeTier.name,
            tier:     activeTier.tier,
            subnet:   activeTier.subnet,
            gateway:  activeTier.gateway,
            poolStart: activeTier.poolStart,
            poolEnd:  activeTier.poolEnd,
            maxUsers: activeTier.maxUsers,
          } : null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setScript(d.script);
      // Refresh router to pick up newly generated VPN creds
      const r2 = await fetch(`/api/v1/routers/${selectedId}/setup`, { headers: { 'X-Tenant-ID': TENANT_ID } });
      const d2 = await r2.json();
      setRouter(d2.router);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    setTesting(true); setTestResult(null);
    const res = await fetch(`/api/v1/routers/${selectedId}/test-connection`, { headers: { 'X-Tenant-ID': TENANT_ID } });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function markComplete() {
    await fetch(`/api/v1/routers/${selectedId}/setup/complete`, {
      method: 'PATCH', headers: { 'X-Tenant-ID': TENANT_ID },
    }).catch(() => {});
    setStep(5);
  }

  const card: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #222', borderRadius: 14, padding: 26 };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 12 }}>
        <a href="/admin/settings/routers" style={{ color: '#444', textDecoration: 'none' }}>Routers</a>
        <span style={{ color: '#333' }}>→</span>
        <span style={{ color: '#888' }}>MikroTik Setup Wizard</span>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>MikroTik Setup Wizard</h1>
        <p style={{ fontSize: 12, color: '#555', margin: 0 }}>Configure iCube RADIUS, VPN tunnel, hotspot, and firewall in one script</p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <StepBar current={step} />

        {/* ── STEP 1: Router + Model ──────────────────────────────────────── */}
        {step === 1 && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Select Router & Model</h2>
            <p style={{ fontSize: 12, color: '#555', margin: '0 0 20px' }}>Choose the router to configure and its exact MikroTik hardware model</p>

            {/* Router selector */}
            <Field label="Router">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                {routers.filter(r => !r.brand || r.brand === 'mikrotik').map(r => (
                  <button key={r.id} type="button" onClick={() => setSelectedId(r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: selectedId === r.id ? 'rgba(29,158,117,0.1)' : '#111', border: `1px solid ${selectedId === r.id ? '#1D9E75' : '#222'}`, borderRadius: 9, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: selectedId === r.id ? 'rgba(29,158,117,0.2)' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RouterIcon size={14} style={{ color: selectedId === r.id ? '#1D9E75' : '#555' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{r.name}</p>
                      <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>{r.ip_address}</p>
                    </div>
                    {r.setup_completed && <span style={{ fontSize: 10, color: '#1D9E75', background: 'rgba(29,158,117,0.1)', borderRadius: 5, padding: '2px 7px' }}>Done</span>}
                    {selectedId === r.id && <CheckCircle size={14} style={{ color: '#1D9E75' }} />}
                  </button>
                ))}
                {routers.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: '#444' }}>
                    No routers found. <a href="/admin/settings/routers" style={{ color: '#1D9E75', textDecoration: 'none' }}>Add one first →</a>
                  </div>
                )}
              </div>
            </Field>

            {/* Divider */}
            <div style={{ height: 1, background: '#1e1e1e', margin: '20px 0' }} />

            {/* Model selector */}
            <Field label="MikroTik Model" hint="Select the exact hardware model — this determines the subnet size and script optimisations">
              <div style={{ marginTop: 2 }}>
                <ModelSelector value={selModel} onChange={setSelModel} />
              </div>
            </Field>

            {/* Expected users field */}
            {selModel && (
              <div style={{ marginTop: 14 }}>
                <Field label="Expected Simultaneous Users" hint="Used to gauge if the selected tier's subnet is large enough">
                  <input style={inp} type="number" min={0} max={50000}
                    value={expectedUsers || ''} placeholder={`Max for this tier: ${activeTier?.maxUsers}`}
                    onChange={e => setExpectedUsers(parseInt(e.target.value) || 0)} />
                </Field>
              </div>
            )}

            {/* Tier summary */}
            {selModel && activeTier && (
              <div style={{ marginTop: 16 }}>
                <TierSummaryCard tier={activeTier} expectedUsers={expectedUsers} />
              </div>
            )}

            {/* L009 note */}
            {selModel && (selModel as any).is_l009 && (
              <div style={{ marginTop: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 9, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <Info size={14} style={{ color: '#a5b4fc', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: '#a5b4fc', lineHeight: 1.6 }}>
                  <strong>L009 Hardware Offloading:</strong> The L009 supports hardware packet processing. The generated script includes:<br />
                  <code style={{ fontSize: 11, color: '#818cf8' }}>/interface ethernet set [find] l2mtu=1598</code><br />
                  <code style={{ fontSize: 11, color: '#818cf8' }}>/interface bridge set [find] fast-forward=yes</code>
                </div>
              </div>
            )}

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(2)} disabled={!selectedId || !selModel}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: !selectedId || !selModel ? 'not-allowed' : 'pointer', opacity: !selectedId || !selModel ? 0.35 : 1 }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Network Config ──────────────────────────────────────── */}
        {step === 2 && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Network Configuration</h2>
            <p style={{ fontSize: 12, color: '#555', margin: '0 0 20px' }}>
              Pre-filled from <strong style={{ color: '#aaa' }}>{selModel?.name}</strong> (Tier {activeTier?.tier}). Override if needed.
            </p>

            {/* Pre-filled tier info */}
            {activeTier && (
              <div style={{ marginBottom: 18 }}>
                <TierSummaryCard tier={activeTier} expectedUsers={expectedUsers} isCustom={netConfig.use_custom} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="WAN Interface" hint="Internet-facing port (e.g. ether1, pppoe-out1)">
                  <input style={inp} value={netConfig.wan_interface}
                    onChange={e => setNetConfig(c => ({ ...c, wan_interface: e.target.value }))} placeholder="ether1" />
                </Field>
                <Field label="LAN Interface" hint="Hotspot clients connect here">
                  <input style={inp} value={netConfig.lan_interface}
                    onChange={e => setNetConfig(c => ({ ...c, lan_interface: e.target.value }))} placeholder="ether2" />
                </Field>
              </div>

              <Field label="DNS Servers" hint="Comma-separated">
                <input style={inp} value={netConfig.dns_servers}
                  onChange={e => setNetConfig(c => ({ ...c, dns_servers: e.target.value }))} placeholder="8.8.8.8,8.8.4.4" />
              </Field>

              {/* Custom subnet toggle */}
              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 9, padding: '12px 14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: netConfig.use_custom ? 12 : 0 }}>
                  <div onClick={() => setNetConfig(c => ({ ...c, use_custom: !c.use_custom }))}
                    style={{ width: 36, height: 20, borderRadius: 99, background: netConfig.use_custom ? '#1D9E75' : '#2a2a2a', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 2, left: netConfig.use_custom ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize: 13, color: '#ccc' }}>Override with custom subnet</span>
                </label>

                {netConfig.use_custom && (
                  <div>
                    <input style={{ ...inp, borderColor: subnetError ? '#ef4444' : '#2a2a2a' }}
                      value={netConfig.custom_subnet}
                      placeholder="e.g. 192.168.10.0/24"
                      onChange={e => { setNetConfig(c => ({ ...c, custom_subnet: e.target.value })); validateCustomSubnet(e.target.value); }} />
                    {subnetError && (
                      <p style={{ fontSize: 11, color: '#f87171', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertCircle size={11} /> {subnetError}
                      </p>
                    )}
                    {!subnetError && netConfig.custom_subnet && isRFC1918(netConfig.custom_subnet) && (
                      <p style={{ fontSize: 11, color: '#1D9E75', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle size={11} /> Valid RFC1918 private subnet
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: '#444', margin: '5px 0 0', lineHeight: 1.4 }}>
                      Must be a private range: 10.x.x.x/8–30, 172.16–31.x.x/12–30, 192.168.x.x/16–30
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                <ChevronLeft size={14} /> Back
              </button>
              <button onClick={() => setStep(3)} disabled={netConfig.use_custom && (!!subnetError || !netConfig.custom_subnet)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: netConfig.use_custom && (!!subnetError || !netConfig.custom_subnet) ? 0.4 : 1 }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: VPN Credentials ─────────────────────────────────────── */}
        {step === 3 && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>VPN & RADIUS Credentials</h2>
            <p style={{ fontSize: 12, color: '#555', margin: '0 0 20px' }}>
              Auto-generated for <strong style={{ color: '#aaa' }}>{router?.name}</strong>. These are embedded in the generated script.
            </p>

            {router?.vpn_username ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'VPN Username',   value: router.vpn_username,   secret: false },
                  { label: 'VPN Password',   value: router.vpn_password,   secret: true  },
                  { label: 'RADIUS Secret',  value: router.radius_secret,  secret: true  },
                ].map(({ label, value, secret }) => (
                  <div key={label} style={{ background: '#111', border: '1px solid #222', borderRadius: 9, padding: '12px 14px' }}>
                    <p style={{ fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>{label}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 12, color: '#1D9E75', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {secret && !showPwd ? '•'.repeat(Math.min(value?.length || 12, 24)) : (value || '—')}
                      </code>
                      {secret && (
                        <button onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2, display: 'flex' }}>
                          {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      )}
                      <button onClick={() => navigator.clipboard.writeText(value || '')}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#888', cursor: 'pointer' }}>
                        <Copy size={11} /> Copy
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ background: 'rgba(29,158,117,0.07)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                  <strong style={{ color: '#1D9E75' }}>ℹ️</strong>{' '}
                  These credentials are unique per router. The VPN uses <strong style={{ color: '#aaa' }}>L2TP/IPsec</strong> — your router will connect to iCube VPN on setup. RADIUS handles hotspot authentication.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <div style={{ width: 20, height: 20, border: '2px solid #1D9E75', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                <ChevronLeft size={14} /> Back
              </button>
              <button onClick={generateScript} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</> : <>Generate Script <ChevronRight size={14} /></>}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
                <AlertCircle size={12} /> {error}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Script ──────────────────────────────────────────────── */}
        {step === 4 && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Generated Setup Script</h2>
                <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                  {selModel?.name} · {activeTier?.name} · {getEffectiveNet().network_cidr}
                </p>
              </div>
              <ScriptActions script={script} routerName={router?.name || 'router'} />
            </div>

            {/* Apply instructions */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 9, padding: '13px 15px', marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#aaa', margin: '0 0 9px' }}>How to apply this script:</p>
              {[
                'Open MikroTik Winbox or WebFig → New Terminal',
                'Download the .rsc file using the button above',
                'In Winbox: Files → Upload the .rsc file',
                'In Terminal: /import file-name=icube-setup.rsc',
                'Wait for: ":log info iCube setup complete"',
                'Router connects to iCube VPN within 60 seconds',
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#555', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>

            {/* Script pre */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <pre style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 9, padding: '16px', fontSize: 11, color: '#a3e635', fontFamily: '"Fira Code", "JetBrains Mono", Menlo, monospace', overflow: 'auto', maxHeight: 380, lineHeight: 1.65, whiteSpace: 'pre', margin: 0 }}>
                {script || '# Script not yet generated'}
              </pre>
            </div>

            {/* Test connection */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 9, padding: '13px 15px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>Test VPN Connection</p>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>Verify the router has connected to iCube VPN</p>
                </div>
                <button onClick={testConnection} disabled={testing}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
                  {testing ? <><Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Testing…</> : <><Wifi size={12} /> Test</>}
                </button>
              </div>
              {testResult && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: testResult.reachable ? '#1D9E75' : '#f87171' }}>
                  <Circle size={7} style={{ fill: testResult.reachable ? '#1D9E75' : '#ef4444', color: testResult.reachable ? '#1D9E75' : '#ef4444', flexShrink: 0 }} />
                  {testResult.message}
                  {testResult.latency_ms && <span style={{ color: '#555' }}>({testResult.latency_ms}ms)</span>}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                <ChevronLeft size={14} /> Back
              </button>
              <button onClick={markComplete} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Mark Complete <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Done ────────────────────────────────────────────────── */}
        {step === 5 && (
          <div style={{ ...card, textAlign: 'center', padding: '48px 28px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(29,158,117,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={30} style={{ color: '#1D9E75' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>Setup Complete!</h2>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px', lineHeight: 1.7, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              <strong style={{ color: '#aaa' }}>{router?.name}</strong> has been configured for iCube with the{' '}
              <strong style={{ color: '#aaa' }}>{selModel?.name}</strong> profile.
              The router will send heartbeats every 60 seconds once online.
            </p>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 9, padding: '12px 16px', maxWidth: 360, margin: '0 auto 24px', textAlign: 'left' }}>
              {[
                ['Model',   selModel?.name || '—'],
                ['Tier',    activeTier?.name || '—'],
                ['Network', getEffectiveNet().network_cidr],
                ['Gateway', getEffectiveNet().gateway],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#888' }}>
                  <span style={{ color: '#555' }}>{k}</span>
                  <span style={{ fontFamily: 'monospace', color: '#ccc' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 260, margin: '0 auto' }}>
              <a href="/admin/router" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1D9E75', color: '#fff', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                <Wifi size={14} /> Router Observability
              </a>
              <a href="/admin/settings/routers" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '10px 0', fontSize: 13, textDecoration: 'none' }}>
                ← Back to Routers
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Default export with Suspense boundary ─────────────────────────────────────
export default function RouterSetupWizard() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 22, height: 22, border: '2px solid #1D9E75', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <RouterSetupWizardInner />
    </Suspense>
  );
}
