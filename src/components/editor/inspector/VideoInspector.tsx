'use client';

import { VideoClip } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import {
  Film, Volume2, VolumeX, Zap, Scissors, Copy, Trash2,
  RotateCcw, Sliders, Maximize, Crop, Sparkles
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface Props { clip: VideoClip; }

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      marginBottom: 8, marginTop: 14,
    }}>
      {label}
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 0.01, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }} dir="rtl">{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {value.toFixed(2)}{unit}
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

export function VideoInspector({ clip }: Props) {
  const { updateClip, splitClip, duplicateClip, removeClip } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const update = (updates: Partial<VideoClip>) => updateClip<VideoClip>(clip.id, updates);

  // Quick preset filters for Color Grade
  const applyFilter = (preset: 'normal' | 'vivid' | 'cinematic' | 'bw' | 'warm') => {
    switch (preset) {
      case 'vivid':
        update({ colorGrade: { ...clip.colorGrade, brightness: 0.05, contrast: 0.15, saturation: 0.3 } });
        break;
      case 'cinematic':
        update({ colorGrade: { ...clip.colorGrade, brightness: -0.05, contrast: 0.2, saturation: -0.1, vignette: 0.3 } });
        break;
      case 'bw':
        update({ colorGrade: { ...clip.colorGrade, saturation: -1, contrast: 0.1 } });
        break;
      case 'warm':
        update({ colorGrade: { ...clip.colorGrade, temperature: 0.25, saturation: 0.1 } });
        break;
      default:
        update({ colorGrade: { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0, vignette: 0 } });
        break;
    }
  };

  // Reset transform to default fit
  const resetTransform = () => {
    update({
      transform: {
        x: 0, y: 0,
        width: 100, height: 100,
        rotation: 0, scaleX: 1, scaleY: 1,
        opacity: 1,
        cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
      }
    });
  };

  // Fill canvas (cover 9:16)
  const fillCanvas = () => {
    update({
      transform: {
        ...clip.transform,
        x: 0, y: 0,
        width: 135, height: 135,
        rotation: 0,
      }
    });
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header & Quick Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={14} color="#8B5CF6" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>فيديو Clip</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(clip.duration)}</div>
          </div>
        </div>

        {/* Clip operations */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => splitClip(clip.id, currentTime)}
            title="تقطيع عند مؤشر التشغيل (S)"
          >
            <Scissors size={13} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => duplicateClip(clip.id)}
            title="تكرار المقطع"
          >
            <Copy size={13} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => removeClip(clip.id)}
            title="حذف المقطع"
          >
            <Trash2 size={13} color="var(--color-error)" />
          </button>
        </div>
      </div>

      {/* ── Audio Section ── */}
      <SectionHeader label="الصوت ومستوى الصوت" />
      <SliderRow
        label="مستوى الصوت"
        value={clip.volume}
        min={0} max={2} step={0.01}
        onChange={v => update({ volume: v })}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
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
      <SliderRow
        label="Fade In (ثواني)"
        value={clip.audioFade?.fadeIn ?? 0}
        min={0} max={3} step={0.1}
        onChange={v => update({ audioFade: { ...clip.audioFade, fadeIn: v } })}
      />
      <SliderRow
        label="Fade Out (ثواني)"
        value={clip.audioFade?.fadeOut ?? 0}
        min={0} max={3} step={0.1}
        onChange={v => update({ audioFade: { ...clip.audioFade, fadeOut: v } })}
      />

      {/* ── Speed Section ── */}
      <SectionHeader label="سرعة التشغيل" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
        {[0.5, 1, 1.5, 2].map(speed => (
          <button
            key={speed}
            onClick={() => update({ playbackSpeed: speed, duration: (clip.trimEnd - clip.trimStart) / speed })}
            className="btn btn-sm"
            style={{
              background: clip.playbackSpeed === speed ? 'var(--brand-primary)' : 'var(--bg-elevated)',
              color: clip.playbackSpeed === speed ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${clip.playbackSpeed === speed ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
            }}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* ── Transform & Canvas Framing ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          الموضع والتحجيم
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 10, padding: '2px 6px', height: 22 }}
          onClick={resetTransform}
        >
          <RotateCcw size={10} style={{ marginRight: 3 }} /> إعادة ضبط
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button className="btn btn-surface btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={fillCanvas}>
          <Maximize size={12} /> ملء الشاشة (9:16)
        </button>
        <button className="btn btn-surface btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={resetTransform}>
          احتواء (Fit)
        </button>
      </div>

      <SliderRow
        label="الحجم (Zoom)"
        value={clip.transform.width}
        min={20} max={250} step={1} unit="%"
        onChange={v => update({ transform: { ...clip.transform, width: v, height: v } })}
      />
      <SliderRow
        label="الشفافية"
        value={clip.transform.opacity}
        min={0} max={1} step={0.05}
        onChange={v => update({ transform: { ...clip.transform, opacity: v } })}
      />
      <SliderRow
        label="الدوران"
        value={clip.transform.rotation}
        min={-180} max={180} step={1} unit="°"
        onChange={v => update({ transform: { ...clip.transform, rotation: v } })}
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>موضع X</span>
          <input
            type="number"
            className="input"
            value={Math.round(clip.transform.x)}
            onChange={e => update({ transform: { ...clip.transform, x: parseInt(e.target.value) || 0 } })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>موضع Y</span>
          <input
            type="number"
            className="input"
            value={Math.round(clip.transform.y)}
            onChange={e => update({ transform: { ...clip.transform, y: parseInt(e.target.value) || 0 } })}
          />
        </div>
      </div>

      {/* ── Color Grading & Filters ── */}
      <SectionHeader label="فلاتر وتصحيح الألوان" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {[
          { id: 'normal', label: 'طبيعي' },
          { id: 'vivid', label: 'حيوي 🔥' },
          { id: 'cinematic', label: 'سينمائي 🎬' },
          { id: 'warm', label: 'دافئ ☀️' },
          { id: 'bw', label: 'أبيض وأسود' },
        ].map(filter => (
          <button
            key={filter.id}
            className="btn btn-surface btn-sm"
            style={{ fontSize: 10, padding: '3px 8px', height: 24 }}
            onClick={() => applyFilter(filter.id as 'normal' | 'vivid' | 'cinematic' | 'bw' | 'warm')}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <SliderRow
        label="السطوع"
        value={clip.colorGrade.brightness}
        min={-1} max={1} step={0.05}
        onChange={v => update({ colorGrade: { ...clip.colorGrade, brightness: v } })}
      />
      <SliderRow
        label="التباين"
        value={clip.colorGrade.contrast}
        min={-1} max={1} step={0.05}
        onChange={v => update({ colorGrade: { ...clip.colorGrade, contrast: v } })}
      />
      <SliderRow
        label="التشبع"
        value={clip.colorGrade.saturation}
        min={-1} max={1} step={0.05}
        onChange={v => update({ colorGrade: { ...clip.colorGrade, saturation: v } })}
      />
      <SliderRow
        label="الظل الدائري (Vignette)"
        value={clip.colorGrade.vignette ?? 0}
        min={0} max={1} step={0.05}
        onChange={v => update({ colorGrade: { ...clip.colorGrade, vignette: v } })}
      />
    </div>
  );
}
