'use client';

import { useState } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { DEFAULT_TEXT_STYLE, DEFAULT_TRANSFORM } from '@/types/timeline';
import { generateId } from '@/lib/utils';
import { Type, AlignCenter, Bold, Italic } from 'lucide-react';

const TEXT_PRESETS = [
  { label: 'عنوان', style: { ...DEFAULT_TEXT_STYLE, fontSize: 72, fontWeight: '800' }, preview: 'عنوان كبير' },
  { label: 'عنوان فرعي', style: { ...DEFAULT_TEXT_STYLE, fontSize: 48, fontWeight: '600' }, preview: 'عنوان فرعي' },
  { label: 'نص عادي', style: { ...DEFAULT_TEXT_STYLE, fontSize: 36, fontWeight: '400' }, preview: 'نص عادي' },
  { label: 'Hook', style: { ...DEFAULT_TEXT_STYLE, fontSize: 60, fontWeight: '900', color: '#F59E0B' }, preview: 'Hook!' },
  { label: 'CTA', style: { ...DEFAULT_TEXT_STYLE, fontSize: 44, fontWeight: '700', color: '#10B981' }, preview: '← تابع!' },
  { label: 'اقتباس', style: { ...DEFAULT_TEXT_STYLE, fontSize: 40, fontWeight: '500', fontStyle: 'italic' as const }, preview: '"اقتباس مميز"' },
];

export function TextPanel() {
  const { project, addClip, addTrack } = useTimelineStore();
  const { selectClip } = useSelectionStore();

  function addText(preset: typeof TEXT_PRESETS[0]) {
    if (!project) return;
    let textTrack = project.tracks.find(t => t.type === 'text');
    if (!textTrack) {
      textTrack = addTrack('text', 'نصوص');
    }

    const clip = addClip(textTrack.id, {
      type: 'text',
      content: preset.preview,
      style: preset.style,
      transform: {
        ...DEFAULT_TRANSFORM,
        y: 200,
      },
      startTime: 0,
      duration: 5,
      effects: [], animations: [], transitions: {},
      order: textTrack.clips.length,
      locked: false,
    });
    selectClip(clip.id, textTrack.id);
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
        أنماط النص
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TEXT_PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() => addText(preset)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              borderRadius: 8, padding: '10px 12px',
              cursor: 'pointer', textAlign: 'right',
              transition: 'all 150ms ease',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#8B5CF6';
              (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.05)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
            }}
          >
            <span style={{ fontSize: preset.style.fontSize / 4, fontWeight: preset.style.fontWeight, color: preset.style.color, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
              {preset.preview}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {preset.label} · {preset.style.fontSize}px
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
