'use client';
import { useState } from 'react';
import { Lock, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORIES = ['Limits Increase', 'Feature Access', 'Integration', 'Other'];
const FEATURES = ['Hotspot Site Limit', 'Router Limit', 'PPPoE', 'SMS Notifications', 'AI Assistant', 'Custom Branding'];

export default function LimitRequestPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [feature, setFeature] = useState(FEATURES[0]);
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!agreed || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.features.request({ category, feature, reason });
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white">Feature &amp; Limit Requests</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: '#666' }}>
        Manage and request additional capabilities for Dev ISP. Our team reviews all requests within 24 hours.
      </p>

      {/* Main card */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #222',
          borderRadius: 12,
          padding: '28px 28px',
          maxWidth: 520,
          marginBottom: 20,
        }}
      >
        {/* Icon header */}
        <div className="flex flex-col items-center text-center mb-2">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(29,158,117,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={24} style={{ color: '#1D9E75' }} />
          </div>
          <p className="text-base font-bold text-white mt-3">Request Feature Access</p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(29,158,117,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={22} style={{ color: '#1D9E75' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: '#1D9E75' }}>Request Submitted ✓</p>
            <p className="text-xs" style={{ color: '#666' }}>
              Our team will review your request within 24 hours.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>
                Request Category
              </label>
              <select
                className="input w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Feature */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>
                Select Feature
              </label>
              <select
                className="input w-full"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
              >
                {FEATURES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>
                Reason for Request
              </label>
              <textarea
                className="input w-full"
                rows={4}
                placeholder="Provide context to help our team approve your request faster."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <p className="text-xs mt-1 italic" style={{ color: '#666' }}>
                Provide context to help our team approve your request faster.
              </p>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 mt-3">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#1D9E75', flexShrink: 0 }}
              />
              <label htmlFor="agree" className="text-xs" style={{ color: '#888', cursor: 'pointer' }}>
                By submitting this request, you agree with our terms and conditions and acknowledge that requests are subject to review.
              </label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!agreed || submitting}
              style={{
                width: '100%',
                background: '#1D9E75',
                color: '#fff',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: !agreed || submitting ? 'not-allowed' : 'pointer',
                opacity: !agreed || submitting ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 4,
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Submit Request
            </button>
          </div>
        )}
      </div>

      {/* Info box */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #222',
          borderRadius: 8,
          padding: 16,
          maxWidth: 520,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <Lock size={16} style={{ color: '#444', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-sm font-semibold text-white mb-0.5">Need assistance?</p>
          <p className="text-xs" style={{ color: '#666' }}>
            Contact our support team at{' '}
            <span style={{ color: '#1D9E75' }}>support@yourplatform.net</span>
          </p>
        </div>
      </div>
    </div>
  );
}
