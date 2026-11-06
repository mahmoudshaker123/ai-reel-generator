'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Play, Sparkles, Volume2, ArrowUpLeft, Wand2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export default function VoiceVideoPage() {
  const router = useRouter();
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('طارق (صوت عربي فخم ورصين)');
  const [visualDirector, setVisualDirector] = useState(true);

  const voices = [
    'طارق (صوت عربي فخم ورصين)',
    'آدم (نبرة وثائقية عميقة)',
    'سارة (حديث تفاعلي عفوي وودود)',
    'نور (طاقة حماسية للريلز السريعة)',
  ];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim()) return;
    router.push(`/?prompt=${encodeURIComponent(script)}&voice=1&visual_director=${visualDirector}`);
  };

  return (
    <AppShell>
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '36px 36px 80px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#233d34',
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#294f40',
            marginBottom: 8,
          }}>
            <Mic size={15} />
            <span>استوديو الصوتيات الذكي · Voice Video Studio</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 3.2vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#233d34',
            margin: '0 0 8px 0',
          }}>
            صناعة ريل من فكرة أو سكربت مكتوب
          </h1>
          <p style={{ fontSize: 14.5, color: '#62756b', margin: 0, lineHeight: 1.7 }}>
            اكتب نصك هنا وسيقوم الذكاء الاصطناعي بقراءته بنبرة بشرية واقعية، وتوليد كروت إنفوجرافيك وكابشن متحرك تلقائياً.
          </p>
        </div>

        <form onSubmit={handleGenerate} style={{
          background: '#ffffff',
          border: '1px solid #dfe4da',
          borderRadius: 16,
          padding: '28px 30px',
          display: 'grid',
          gap: 22,
          boxShadow: '0 2px 10px rgba(36, 62, 53, 0.03)',
        }}>
          {/* Script Textarea */}
          <div>
            <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#233d34', marginBottom: 8 }}>
              نص السكربت أو الفكرة
            </label>
            <textarea
              rows={6}
              required
              placeholder="اكتب هنا النص أو الحكاية التي تريد أن يقرأها الذكاء الاصطناعي ويصنع منها ريل كامل متناسق..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              style={{
                width: '100%',
                background: '#f8faf6',
                border: '1px solid #dfe4da',
                borderRadius: 10,
                padding: '14px 16px',
                color: '#233d34',
                fontSize: 14,
                lineHeight: 1.8,
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'Cairo, sans-serif',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#294f40')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#dfe4da')}
            />
          </div>

          {/* Voice Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#233d34', marginBottom: 8 }}>
              اختيار صوت الإلقاء
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
              {voices.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setSelectedVoice(v)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: selectedVoice === v
                      ? '2px solid #294f40'
                      : '1px solid #dfe4da',
                    background: selectedVoice === v
                      ? '#edf3ec'
                      : '#ffffff',
                    color: selectedVoice === v ? '#294f40' : '#57675e',
                    fontSize: 13,
                    fontWeight: selectedVoice === v ? 700 : 600,
                    cursor: 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: selectedVoice === v ? '0 2px 8px rgba(41, 79, 64, 0.08)' : 'none',
                  }}
                >
                  <Volume2 size={16} color={selectedVoice === v ? '#294f40' : '#8a9487'} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Visual Director Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="voice-director-toggle"
              checked={visualDirector}
              onChange={(e) => setVisualDirector(e.target.checked)}
              style={{ accentColor: '#294f40', width: 17, height: 17 }}
            />
            <label htmlFor="voice-director-toggle" style={{ fontSize: 13.5, color: '#233d34', cursor: 'pointer', fontWeight: 600 }}>
              تفعيل المخرج البصري التلقائي (توليد كروت إنفوجرافيك وتقسيم شاشة يطابق الشرح)
            </label>
          </div>

          {/* CTA */}
          <button
            type="submit"
            style={{
              height: 46,
              background: '#294f40',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(41, 79, 64, 0.25)',
              marginTop: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3b30')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#294f40')}
          >
            <Wand2 size={17} />
            <span>توليد الفيديو الصوتي الآن</span>
            <ArrowUpLeft size={18} />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
