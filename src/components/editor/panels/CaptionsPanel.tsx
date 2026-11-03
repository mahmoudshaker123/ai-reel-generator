'use client';

import { Captions, Plus, Languages } from 'lucide-react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { DEFAULT_CAPTION_STYLE, DEFAULT_TRANSFORM } from '@/types/timeline';

import { useUIStore } from '@/stores/uiStore';

const CAPTION_STYLES = [
  { label: 'Bold', desc: 'نص أبيض عريض بخلفية داكنة', style: { ...DEFAULT_CAPTION_STYLE, preset: 'bold' as const } },
  { label: 'Minimal', desc: 'نص بسيط بظل خفيف', style: { ...DEFAULT_CAPTION_STYLE, preset: 'minimal' as const, showBackground: false } },
  { label: 'Highlight', desc: 'كلمة تضيء عند النطق', style: { ...DEFAULT_CAPTION_STYLE, preset: 'highlight' as const } },
  { label: 'Karaoke', desc: 'كلمة بكلمة مع تمييز ملون', style: { ...DEFAULT_CAPTION_STYLE, preset: 'karaoke' as const } },
];

export function CaptionsPanel() {
  const { project, addClip, addTrack } = useTimelineStore();
  const { selectClip } = useSelectionStore();
  const { setActiveLeftTab } = useUIStore();

  function addCaptionClip(style: typeof CAPTION_STYLES[0]) {
    if (!project) return;
    let captionTrack = project.tracks.find(t => t.type === 'caption');
    if (!captionTrack) {
      captionTrack = addTrack('caption', 'كابشن');
    }

    const clip = addClip(captionTrack.id, {
      type: 'caption',
      segments: [
        {
          id: 'seg_1',
          text: 'أضف النص هنا',
          startTime: 0,
          endTime: 3,
          words: [
            { word: 'أضف', startTime: 0, endTime: 0.5 },
            { word: 'النص', startTime: 0.5, endTime: 1.0 },
            { word: 'هنا', startTime: 1.0, endTime: 1.5 },
          ],
        },
      ],
      style: style.style,
      transform: {
        ...DEFAULT_TRANSFORM,
        y: 600,  // bottom area
      },
      animationType: 'sentence',
      startTime: 0,
      duration: 3,
      effects: [], animations: [], transitions: {},
      order: captionTrack.clips.length,
      locked: false,
    });
    selectClip(clip.id, captionTrack.id);
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
        أنماط الكابشن
      </div>

      {/* AI Generate button */}
      <button
        onClick={() => setActiveLeftTab('ai')}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 12,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.1))',
          border: '1px solid rgba(139,92,246,0.3)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <Languages size={15} color="#8B5CF6" />
        <span style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 600 }} dir="rtl">
          توليد كابشن تلقائي بالـ AI
        </span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CAPTION_STYLES.map(style => (
          <button
            key={style.label}
            onClick={() => addCaptionClip(style)}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
              borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
              textAlign: 'right', transition: 'all 150ms ease',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#10B981'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-border)'; }}
          >
            <div dir="rtl">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{style.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{style.desc}</div>
            </div>
            <Plus size={14} color="var(--text-muted)" />
          </button>
        ))}
      </div>
    </div>
  );
}
