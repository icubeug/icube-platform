'use client';
import { Mail, Phone, Clock, BookOpen, Code2, Play } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-6">Support</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* Contact Support */}
        <div style={{
          background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Contact Support</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={14} color="#1D9E75" style={{ flexShrink: 0 }} />
              <a href="mailto:support@yourplatform.net" style={{
                color: '#60a5fa', fontSize: 13, textDecoration: 'none',
              }}>support@yourplatform.net</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={14} color="#1D9E75" style={{ flexShrink: 0 }} />
              <span style={{ color: '#aaa', fontSize: 13 }}>+256 700 000 000</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={14} color="#1D9E75" style={{ flexShrink: 0 }} />
              <span style={{ color: '#aaa', fontSize: 13 }}>Mon–Fri, 8am–6pm EAT</span>
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div style={{
          background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Documentation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={14} color="#1D9E75" style={{ flexShrink: 0 }} />
              <a href="#" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>
                Platform Docs
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Code2 size={14} color="#1D9E75" style={{ flexShrink: 0 }} />
              <a href="#" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>
                API Reference
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Play size={14} color="#1D9E75" style={{ flexShrink: 0 }} />
              <a href="#" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>
                Video Tutorials
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
