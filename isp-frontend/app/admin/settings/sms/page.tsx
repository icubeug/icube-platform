'use client';
import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { api, SmsSettings } from '@/lib/api';

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: enabled ? '#1D9E75' : '#333',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 200ms',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: enabled ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 200ms',
        }}
      />
    </div>
  );
}

function fmt(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(n);
}

export default function SmsSettingsPage() {
  const [agentSales, setAgentSales] = useState(false);
  const [realtimeMomo, setRealtimeMomo] = useState(false);
  const [delayedReminder, setDelayedReminder] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState<number | ''>('');
  const [savingDelay, setSavingDelay] = useState(false);
  const [savedDelay, setSavedDelay] = useState(false);
  const [credit, setCredit] = useState(0);
  const [perSmsRate, setPerSmsRate] = useState(35);

  useEffect(() => {
    api.settings.getSms().then((d: SmsSettings) => {
      setAgentSales(d.agent_sales_sms);
      setRealtimeMomo(d.realtime_momo_sms);
      setDelayedReminder(d.delayed_reminder_minutes !== null);
      setDelayMinutes(d.delayed_reminder_minutes ?? '');
      setCredit(d.account_credit ?? 0);
      setPerSmsRate(d.per_sms_rate ?? 35);
    }).catch(() => {});
  }, []);

  async function toggle(field: keyof SmsSettings, value: boolean | number | null) {
    try {
      await api.settings.putSms({ [field]: value } as Partial<SmsSettings>);
    } catch {}
  }

  function handleAgentSales() {
    const next = !agentSales;
    setAgentSales(next);
    toggle('agent_sales_sms', next);
  }

  function handleRealtimeMomo() {
    const next = !realtimeMomo;
    setRealtimeMomo(next);
    toggle('realtime_momo_sms', next);
  }

  function handleDelayedReminder() {
    const next = !delayedReminder;
    setDelayedReminder(next);
    if (!next) {
      toggle('delayed_reminder_minutes', null);
    }
  }

  async function saveDelay() {
    setSavingDelay(true);
    try {
      await api.settings.putSms({ delayed_reminder_minutes: delayedReminder ? (Number(delayMinutes) || null) : null });
      setSavedDelay(true);
      setTimeout(() => setSavedDelay(false), 2000);
    } catch {}
    finally { setSavingDelay(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-6">SMS Settings</h1>

      {/* Event Notifications */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <p className="text-sm font-semibold text-white mb-5">Event Notifications</p>

        {/* Agent Sales */}
        <div className="flex items-start gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid #222' }}>
          <Toggle enabled={agentSales} onToggle={handleAgentSales} />
          <div>
            <p className="text-sm font-medium text-white mb-1">Agent Sales</p>
            <p className="text-xs" style={{ color: '#666' }}>
              Send an SMS to clients immediately when an agent prints or registers a voucher directly to their phone number
            </p>
          </div>
        </div>

        {/* Realtime Mobile Money */}
        <div className="flex items-start gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid #222' }}>
          <Toggle enabled={realtimeMomo} onToggle={handleRealtimeMomo} />
          <div>
            <p className="text-sm font-medium text-white mb-1">Realtime Mobile Money Purchases</p>
            <p className="text-xs" style={{ color: '#666' }}>
              Send an SMS code immediately to the buyer as soon as their mobile money payment clears automatically
            </p>
          </div>
        </div>

        {/* Delayed Login Reminder */}
        <div className="flex items-start gap-4">
          <Toggle enabled={delayedReminder} onToggle={handleDelayedReminder} />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <p className="text-sm font-medium text-white">Delayed Login Reminder</p>
              {delayedReminder && (
                <input
                  type="number"
                  min={0}
                  max={999}
                  className="input"
                  style={{ width: 72, padding: '4px 8px', fontSize: 12 }}
                  placeholder="min"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                />
              )}
            </div>
            <p className="text-xs mb-3" style={{ color: '#666' }}>
              If a client pays via Mobile Money but doesn&apos;t log in within a specific timeframe, send them a reminder SMS. Leave blank to disable.
            </p>
            {delayedReminder && (
              <div className="flex items-center gap-3">
                <button
                  onClick={saveDelay}
                  disabled={savingDelay}
                  style={{
                    background: '#1D9E75',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '7px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: savingDelay ? 'not-allowed' : 'pointer',
                    opacity: savingDelay ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {savingDelay && <Loader2 size={13} className="animate-spin" />}
                  Save
                </button>
                {savedDelay && (
                  <span style={{ color: '#1D9E75', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={13} /> Saved
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform SMS Billing */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <p className="text-sm font-semibold text-white mb-5">Platform SMS Billing</p>

        {/* Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#666' }}>Per Message Rate</span>
            <span className="text-sm font-semibold" style={{ color: '#666' }}>UGX {perSmsRate} /SMS</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#666' }}>Available Account Credit</span>
            <span
              className="text-sm font-semibold"
              style={{ color: credit < 10000 ? '#ef4444' : '#1D9E75' }}
            >
              {fmt(credit)}
            </span>
          </div>
        </div>

        {/* Info box */}
        <div
          className="mb-4"
          style={{
            background: '#1a1510',
            border: '1px solid #3a2a20',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <p className="text-xs" style={{ color: '#aaa' }}>
            SMS fees are primarily deducted automatically from your Account Credit (Prepaid Balance).
            Ensure you maintain sufficient credit to avoid service interruptions.
          </p>
        </div>

        {/* Top Up button */}
        <button
          style={{
            background: '#1D9E75',
            color: '#fff',
            borderRadius: 8,
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
          }}
        >
          Top Up Account Credit →
        </button>
      </div>
    </div>
  );
}
