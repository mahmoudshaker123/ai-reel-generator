'use client';

import { useUIStore } from '@/stores/uiStore';
import { Music, Mic, Volume2 } from 'lucide-react';

export function AudioPanel() {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
        الصوت
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { icon: <Music size={16} />, label: 'موسيقى خلفية', desc: 'ارفع ملف موسيقى من جهازك', color: '#06B6D4' },
          { icon: <Mic size={16} />,   label: 'تعليق صوتي', desc: 'ارفع ملف تعليق صوتي', color: '#8B5CF6' },
          { icon: <Volume2 size={16} />, label: 'مؤثرات صوتية', desc: 'أضف SFX للمقاطع', color: '#F59E0B' },
        ].map(item => (
          <button
            onClick={() => useUIStore.getState().setActiveLeftTab('media')}
            key={item.label}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
              borderRadius: 8, padding: '12px', cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = item.color; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-border)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ color: item.color }}>{item.icon}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }} dir="rtl">{item.label}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }} dir="rtl">{item.desc}</p>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }} dir="rtl">
        ارفع ملفات الصوت من تبويب الميديا ثم اسحبها إلى مسار الصوت في الـ Timeline
      </div>
    </div>
  );
}
