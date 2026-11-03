'use client';

import { AudioClip } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { Music, Volume2, VolumeX, Trash2 } from 'lucide-react';

interface Props { clip: AudioClip; }

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 12 }}>
      {label}
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }} dir="rtl">{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--brand-primary)' }}
      />
    </div>
  );
}

export function AudioInspector({ clip }: Props) {
  const { updateClip, removeClip } = useTimelineStore();

  const update = (updates: Partial<AudioClip>) => updateClip<AudioClip>(clip.id, updates);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music size={14} color="#06B6D4" />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>صوت Clip</span>
        </div>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => removeClip(clip.id)}
          title="حذف الصوت"
        >
          <Trash2 size={13} color="var(--color-error)" />
        </button>
      </div>

      {/* Volume */}
      <SectionHeader label="الصوت" />
      <SliderRow
        label="مستوى الصوت"
        value={clip.volume}
        min={0} max={2} step={0.01}
        onChange={v => update({ volume: v })}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }} dir="rtl">كتم الصوت</span>
        <div
          onClick={() => update({ muted: !clip.muted })}
          style={{
            width: 32, height: 18, borderRadius: 9,
            background: clip.muted ? 'var(--color-error)' : 'var(--brand-primary)',
            position: 'relative', cursor: 'pointer', transition: 'background 150ms ease',
          }}
        >
          <div style={{
            position: 'absolute', top: 2,
            left: clip.muted ? 16 : 2,
            width: 14, height: 14, borderRadius: '50%', background: '#fff',
            transition: 'left 150ms ease',
          }} />
        </div>
      </div>

      {/* Fade */}
      <SectionHeader label="Fade" />
      <SliderRow
        label="Fade In (ثواني)"
        value={clip.audioFade?.fadeIn ?? 0}
        min={0} max={3} step={0.1}
        onChange={v => update({ audioFade: { ...(clip.audioFade || { fadeIn: 0, fadeOut: 0 }), fadeIn: v } })}
      />
      <SliderRow
        label="Fade Out (ثواني)"
        value={clip.audioFade?.fadeOut ?? 0}
        min={0} max={3} step={0.1}
        onChange={v => update({ audioFade: { ...(clip.audioFade || { fadeIn: 0, fadeOut: 0 }), fadeOut: v } })}
      />

      {/* Audio Type */}
      <SectionHeader label="نوع الصوت" />
      <select
        className="input"
        value={clip.label || 'background_music'}
        onChange={e => update({ label: e.target.value as AudioClip['label'] })}
        dir="rtl"
      >
        <option value="background_music">موسيقى خلفية</option>
        <option value="voiceover">تسجيل صوتي (Voiceover)</option>
        <option value="sfx">مؤثر صوتي (SFX)</option>
      </select>
    </div>
  );
}

