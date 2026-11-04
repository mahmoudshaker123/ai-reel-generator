'use client';

import React, { useState } from 'react';
import { CaptionClip, CaptionStyle, CaptionSegment } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { Captions, Trash2, Plus, Move, Sparkles, Palette, Type, Check } from 'lucide-react';

interface Props { clip: CaptionClip; }

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 14 }}>
      {label}
    </div>
  );
}

const COLOR_PRESETS = [
  { label: 'أصفر فيرال', color: '#FFFF00' },
  { label: 'أبيض ناصع', color: '#FFFFFF' },
  { label: 'أخضر زمردي', color: '#10B981' },
  { label: 'سماوي نيون', color: '#06B6D4' },
  { label: 'وردي جريء', color: '#F43F5E' },
];

export function CaptionInspector({ clip }: Props) {
  const { updateClip, removeClip } = useTimelineStore();
  const { clearSelection } = useSelectionStore();
  const { currentTime } = usePlaybackStore();

  const update = (updates: Partial<CaptionClip>) => updateClip<CaptionClip>(clip.id, updates);
  const updateStyle = (styleUpdates: Partial<CaptionStyle>) =>
    update({ style: { ...clip.style, ...styleUpdates } });

  // Update a specific segment text
  const updateSegmentText = (segId: string, newText: string) => {
    const segments = clip.segments.map(s => {
      if (s.id !== segId) return s;
      const words = newText.split(' ').filter(Boolean);
      const wStep = (s.endTime - s.startTime) / Math.max(1, words.length);
      const wordList = words.map((w, i) => ({
        word: w,
        startTime: round(s.startTime + i * wStep, 2),
        endTime: round(s.startTime + (i + 1) * wStep, 2),
        confidence: 0.98,
      }));
      return { ...s, text: newText, words: wordList };
    });
    update({ segments });
  };

  // Delete a specific segment
  const deleteSegment = (segId: string) => {
    const segments = clip.segments.filter(s => s.id !== segId);
    update({ segments });
  };

  // Add a new segment
  const addSegment = () => {
    const lastSeg = clip.segments[clip.segments.length - 1];
    const newStart = lastSeg ? lastSeg.endTime + 0.1 : 0;
    const newEnd = newStart + 2.5;
    const newSeg: CaptionSegment = {
      id: crypto.randomUUID(),
      text: 'اكتب نص الكابشن هنا',
      startTime: round(newStart, 2),
      endTime: round(newEnd, 2),
      words: [
        { word: 'اكتب', startTime: newStart, endTime: newStart + 0.8 },
        { word: 'نص', startTime: newStart + 0.8, endTime: newStart + 1.6 },
        { word: 'الكابشن', startTime: newStart + 1.6, endTime: newEnd },
      ],
    };
    update({ segments: [...clip.segments, newSeg], duration: Math.max(clip.duration, newEnd) });
  };

  function round(val: number, decimals: number) {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }

  const presets = [
    { id: 'highlight', label: '🔥 فيرال أصفر (Highlight)', color: '#FFFF00' },
    { id: 'bold', label: '📱 تيك توك عريض (Bold)', color: '#F59E0B' },
    { id: 'minimal', label: '✨ بسيط وأنيق (Clean)', color: '#3B82F6' },
    { id: 'karaoke', label: '🎤 كاريوكي متحرك', color: '#EC4899' },
  ];

  return (
    <div style={{ padding: '0 4px', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Captions size={16} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>كابشن وتفريغ نصي</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{clip.segments?.length || 0} جملة صوتية</div>
          </div>
        </div>

        {/* Delete clip button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            removeClip(clip.id);
            clearSelection();
          }}
          title="حذف هذا الكابشن بالكامل"
          style={{ color: '#EF4444', padding: '4px 8px', height: 26, gap: 4, fontSize: 11 }}
        >
          <Trash2 size={13} />
          <span>حذف</span>
        </button>
      </div>

      {/* Tip Banner */}
      <div style={{
        padding: '8px 10px', borderRadius: 8,
        background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.25)',
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#C4B5FD',
        marginBottom: 10,
      }}>
        <Move size={14} color="#A78BFA" style={{ flexShrink: 0 }} />
        <span>اسحب الكابشن بالماوس مباشرة فوق شاشة الفيديو لتغيير مكانه بسهولة!</span>
      </div>

      <SectionHeader label="طريقة الظهور" />
      <div role="group" aria-label="طريقة ظهور الكابشن" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {([
          { id: 'sentence', label: 'سطر كامل', hint: 'الجملة تظهر معًا' },
          { id: 'word_by_word', label: 'كلمة بكلمة', hint: 'كل كلمة بتوقيتها' },
        ] as const).map(mode => (
          <button
            key={mode.id}
            type="button"
            onClick={() => update({ animationType: mode.id })}
            aria-pressed={clip.animationType === mode.id}
            style={{
              padding: '9px 7px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
              border: `1px solid ${clip.animationType === mode.id ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
              background: clip.animationType === mode.id ? 'rgba(139,92,246,.18)' : 'var(--bg-elevated)',
              color: clip.animationType === mode.id ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <b style={{ display: 'block', fontSize: 11 }}>{mode.label}</b>
            <small style={{ display: 'block', marginTop: 3, fontSize: 9, color: 'var(--text-muted)' }}>{mode.hint}</small>
          </button>
        ))}
      </div>

      {/* ── Segments Text List ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>الجمل والنصوص:</div>
        <button
          onClick={addSegment}
          className="btn btn-ghost btn-sm"
          style={{ height: 22, fontSize: 10, padding: '0 6px', color: '#10B981', gap: 2 }}
        >
          <Plus size={11} />
          <span>+ إضافة جملة</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 2 }}>
        {clip.segments && clip.segments.length > 0 ? (
          clip.segments.map((seg, idx) => (
            <div
              key={seg.id}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
                borderRadius: 8, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  #{idx + 1} ({seg.startTime}s - {seg.endTime}s)
                </span>
                <button
                  onClick={() => deleteSegment(seg.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}
                  title="حذف هذه الجملة"
                >
                  <Trash2 size={11} color="#EF4444" />
                </button>
              </div>
              <textarea
                value={seg.text}
                onChange={(e) => updateSegmentText(seg.id, e.target.value)}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 6px',
                  resize: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          ))
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
            لا توجد جمل، اضغط «+ إضافة جملة» لإضافة كابشن.
          </div>
        )}
      </div>

      {/* ── Preset Styles ── */}
      <SectionHeader label="ستايل الكابشن" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {presets.map(p => (
          <button
            key={p.id}
            className="btn btn-sm"
            style={{
              justifyContent: 'flex-start',
              background: clip.style.preset === p.id ? 'rgba(139,92,246,0.2)' : 'var(--bg-elevated)',
              border: `1px solid ${clip.style.preset === p.id ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
              color: clip.style.preset === p.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 11, padding: '6px 8px', borderRadius: 8,
            }}
            onClick={() => updateStyle({ preset: p.id as CaptionStyle['preset'] })}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, marginLeft: 6 }} />
            <span className="truncate">{p.label}</span>
          </button>
        ))}
      </div>

      {/* ── Color Palette ── */}
      <SectionHeader label="لون النص" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {COLOR_PRESETS.map(c => (
          <div
            key={c.color}
            onClick={() => updateStyle({ color: c.color })}
            style={{
              width: 24, height: 24, borderRadius: '50%', background: c.color,
              cursor: 'pointer', border: clip.style.color === c.color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)',
              boxShadow: clip.style.color === c.color ? `0 0 8px ${c.color}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={c.label}
          >
            {clip.style.color === c.color && <Check size={12} color="#000" />}
          </div>
        ))}
      </div>

      {/* ── Background Toggle ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 0', borderBottom: '1px solid var(--bg-border)', marginBottom: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>إظهار خلفية مظللة:</span>
        <input
          type="checkbox"
          checked={clip.style.showBackground ?? true}
          onChange={(e) => updateStyle({ showBackground: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
        />
      </div>

      {/* ── Font Size & Position Sliders ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>حجم الخط ({clip.style.fontSize}px):</span>
      </div>
      <input
        type="range"
        min={28} max={96} step={2}
        value={clip.style.fontSize}
        onChange={e => updateStyle({ fontSize: parseInt(e.target.value) })}
        style={{ width: '100%', accentColor: 'var(--brand-primary)', marginBottom: 8 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>الموقع الرأسي Y ({clip.transform.y}):</span>
      </div>
      <input
        type="range"
        min={-700} max={700} step={10}
        value={clip.transform.y}
        onChange={e => update({ transform: { ...clip.transform, y: parseInt(e.target.value) } })}
        style={{ width: '100%', accentColor: 'var(--brand-primary)', marginBottom: 8 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>الموقع الأفقي X ({clip.transform.x}):</span>
      </div>
      <input
        type="range"
        min={-400} max={400} step={10}
        value={clip.transform.x}
        onChange={e => update({ transform: { ...clip.transform, x: parseInt(e.target.value) } })}
        style={{ width: '100%', accentColor: 'var(--brand-primary)', marginBottom: 12 }}
      />
    </div>
  );
}
