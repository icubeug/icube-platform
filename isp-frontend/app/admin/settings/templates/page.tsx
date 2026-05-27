'use client';
import { useState } from 'react';

interface Template {
  id: string;
  name: string;
  desc: string;
  tags: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    desc: 'Beautiful frosted glass effect with dynamic blur',
    tags: ['Glass Effect', 'Blur Background', 'Modern Aesthetics'],
  },
  {
    id: 'minimalistic',
    name: 'Minimalistic',
    desc: 'Clean and simple portal design for maximum conversions',
    tags: ['Clean', 'Fast Loading', 'High Conversion'],
  },
  {
    id: 'minimalistic-glass',
    name: 'Minimalistic Glass',
    desc: 'Minimalistic design with subtle glass effects',
    tags: ['Glass Effect', 'Minimalistic', 'Modern'],
  },
];

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('liquid-glass');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, 'light' | 'dark'>>({
    'liquid-glass': 'dark',
    'minimalistic': 'light',
    'minimalistic-glass': 'dark',
  });

  function selectVariant(templateId: string, variant: 'light' | 'dark') {
    setSelectedTemplate(templateId);
    setSelectedVariants((prev) => ({ ...prev, [templateId]: variant }));
  }

  function handleApply() {
    // Apply template action
    alert(`Applied: ${selectedTemplate} (${selectedVariants[selectedTemplate] ?? 'dark'} variant)`);
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-6">Hotspot Template Library</h1>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {TEMPLATES.map((tpl) => {
          const isActive = selectedTemplate === tpl.id;
          const variant = selectedVariants[tpl.id] ?? 'dark';

          return (
            <div
              key={tpl.id}
              style={{
                background: '#1a1a1a',
                border: `1px solid ${isActive ? '#1D9E75' : '#222'}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <p className="font-bold text-white text-sm">{tpl.name}</p>
                {isActive && (
                  <span
                    style={{
                      background: '#1D9E75',
                      color: '#fff',
                      fontSize: 10,
                      borderRadius: 9999,
                      padding: '2px 8px',
                      fontWeight: 600,
                    }}
                  >
                    Currently Active
                  </span>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: '#666' }}>{tpl.desc}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {tpl.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: '#222',
                      color: '#888',
                      fontSize: 10,
                      borderRadius: 9999,
                      padding: '2px 8px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Thumbnails */}
              <div className="grid grid-cols-2 gap-3">
                {(['light', 'dark'] as const).map((v) => {
                  const isSelected = isActive && variant === v;
                  return (
                    <div key={v}>
                      <div
                        onClick={() => selectVariant(tpl.id, v)}
                        style={{
                          aspectRatio: '16/9',
                          background: v === 'light' ? '#f8fafc' : '#0f0f0f',
                          borderRadius: 8,
                          border: `2px solid ${isSelected ? '#1D9E75' : 'transparent'}`,
                          position: 'relative',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'border-color 150ms',
                          outline: isSelected ? 'none' : '1px solid #2a2a2a',
                        }}
                      >
                        <span style={{ fontSize: 9, color: v === 'light' ? '#555' : '#666', textAlign: 'center', padding: '0 4px' }}>
                          {tpl.name}
                        </span>
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: '#1D9E75',
                            }}
                          />
                        )}
                      </div>
                      <p className="mt-1" style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>
                        {v === 'light' ? 'Light Theme' : 'Dark Theme'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply button */}
      <button
        onClick={handleApply}
        style={{
          background: '#1D9E75',
          color: '#fff',
          borderRadius: 8,
          padding: '9px 20px',
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Apply Template
      </button>
    </div>
  );
}
