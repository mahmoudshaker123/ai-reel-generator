'use client';

import { TextClip, TextStyle } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Trash2, Move } from 'lucide-react';

interface Props { clip: TextClip; }

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 12 }}>
      {label}
    </div>
  );
}

export function TextInspector({ clip }: Props) {
  const { updateClip, removeClip } = useTimelineStore();
  const { clearSelection } = useSelectionStore();

  const update = (updates: Partial<TextClip>) => updateClip<TextClip>(clip.id, updates);
  const updateStyle = (styleUpdates: Partial<TextStyle>) =>
    update({ style: { ...clip.style, ...styleUpdates } });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Type size={14} color="#F59E0B" />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>نص وهـوك</span>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            removeClip(clip.id);
            clearSelection();
          }}
          title="حذف هذا النص (Delete)"
          style={{ color: '#EF4444', padding: '4px 8px', height: 24, gap: 4, fontSize: 11 }}
        >
          <Trash2 size={12} />
          <span>حذف</span>
        </button>
      </div>

      {/* Tip Banner */}
      <div style={{
        padding: '6px 8px', borderRadius: 6,
        background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)',
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#F472B6',
        marginBottom: 8, direction: 'rtl',
      }}>
        <Move size={13} style={{ flexShrink: 0 }} />
        <span>يمكنك سحب هذا النص مباشرة بالماوس فوق شاشة الفيديو لتغيير مكانه!</span>
      </div>

      {/* Text Content */}
      <SectionHeader label="النص" />
      <textarea
        className="input"
        rows={3}
        value={clip.content}
        onChange={e => update({ content: e.target.value })}
        style={{ resize: 'vertical', width: '100%', marginBottom: 8 }}
        dir="auto"
      />

      {/* Font & Size */}
      <SectionHeader label="الخط والحجم" />
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <select
          className="input"
          value={clip.style.fontFamily}
          onChange={e => updateStyle({ fontFamily: e.target.value })}
          style={{ flex: 2 }}
        >
          <option value="Cairo">Cairo (عربي)</option>
          <option value="Inter">Inter (English)</option>
          <option value="Arial">Arial</option>
          <option value="Impact">Impact</option>
        </select>

        <input
          type="number"
          className="input"
          value={clip.style.fontSize}
          min={12}
          max={200}
          onChange={e => updateStyle({ fontSize: parseInt(e.target.value) || 24 })}
          style={{ flex: 1 }}
        />
      </div>

      {/* Formatting & Alignment */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button
          className="btn btn-sm"
          style={{
            flex: 1,
            background: clip.style.fontWeight === '700' ? 'var(--brand-primary)' : 'var(--bg-elevated)',
            color: clip.style.fontWeight === '700' ? '#fff' : 'var(--text-secondary)',
          }}
          onClick={() => updateStyle({ fontWeight: clip.style.fontWeight === '700' ? '400' : '700' })}
        >
          <Bold size={13} />
        </button>
        <button
          className="btn btn-sm"
          style={{
            flex: 1,
            background: clip.style.fontStyle === 'italic' ? 'var(--brand-primary)' : 'var(--bg-elevated)',
            color: clip.style.fontStyle === 'italic' ? '#fff' : 'var(--text-secondary)',
          }}
          onClick={() => updateStyle({ fontStyle: clip.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
        >
          <Italic size={13} />
        </button>
        {(['left', 'center', 'right'] as const).map(align => (
          <button
            key={align}
            className="btn btn-sm"
            style={{
              flex: 1,
              background: clip.style.textAlign === align ? 'var(--brand-primary)' : 'var(--bg-elevated)',
              color: clip.style.textAlign === align ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => updateStyle({ textAlign: align })}
          >
            {align === 'left' ? <AlignLeft size={13} /> : align === 'center' ? <AlignCenter size={13} /> : <AlignRight size={13} />}
          </button>
        ))}
      </div>

      {/* Colors */}
      <SectionHeader label="الألوان والخلفية" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>لون الخط</span>
          <input
            type="color"
            value={clip.style.color}
            onChange={e => updateStyle({ color: e.target.value })}
            style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid var(--bg-border)', cursor: 'pointer', background: 'transparent' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>لون الخلفية</span>
          <input
            type="color"
            value={clip.style.backgroundColor}
            onChange={e => updateStyle({ backgroundColor: e.target.value })}
            style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid var(--bg-border)', cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      </div>

      {/* Position */}
      <SectionHeader label="الموقع" />
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>X</span>
          <input
            type="number"
            className="input"
            value={Math.round(clip.transform.x)}
            onChange={e => update({ transform: { ...clip.transform, x: parseInt(e.target.value) || 0 } })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Y</span>
          <input
            type="number"
            className="input"
            value={Math.round(clip.transform.y)}
            onChange={e => update({ transform: { ...clip.transform, y: parseInt(e.target.value) || 0 } })}
          />
        </div>
      </div>
    </div>
  );
}

