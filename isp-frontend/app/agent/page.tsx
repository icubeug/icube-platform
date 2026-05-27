'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Wifi, Phone, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function AgentLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin]     = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return setError('Enter your phone number');
    if (pin.length < 4)  return setError('PIN must be at least 4 digits');
    setLoading(true); setError('');
    try {
      const res = await api.agents.login(phone.trim(), pin);
      // Store token and agent info
      localStorage.setItem('agent_token', res.token);
      localStorage.setItem('agent_info', JSON.stringify(res.agent));
      router.push('/agent/pos');
    } catch (e: any) {
      setError(e.message || 'Invalid phone or PIN');
    } finally {
      setLoading(false);
    }
  }

  // PIN digit handler — only allow digits, max 6
  function handlePin(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(v);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green to-emerald-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <Wifi size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Agent Login</h1>
          <p className="text-emerald-100 text-sm mt-1">ISP Platform · Point of Sale</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="e.g. 0700123456"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input pl-9 text-base py-3"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">PIN</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  placeholder="••••"
                  value={pin}
                  onChange={handlePin}
                  className="input pl-9 pr-10 text-base py-3 tracking-widest font-mono"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading
                ? <><span className="spinner mr-2" />Logging in…</>
                : 'Login'
              }
            </button>
          </form>

          <div className="text-center">
            <a href="/admin" className="text-xs text-slate-400 hover:text-slate-600">
              Admin panel →
            </a>
          </div>
        </div>

        <p className="text-center text-emerald-100 text-xs mt-6">
          Contact your administrator if you forgot your PIN
        </p>
      </div>
    </div>
  );
}
