'use client';

import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { EffectType, TransitionType } from '@/types/timeline';
import { Wand2, Check, Sparkles } from 'lucide-react';
import { generateId } from '@/lib/utils';

const EFFECTS: { id: EffectType; name: string; icon: string }[] = [
  { id: 'brightness', name: 'سطوع عالي', icon: '☀️' },
  { id: 'contrast', name: 'تباين حاد', icon: '◑' },
  { id: 'saturation', name: 'ألوان حيوية', icon: '🎨' },
  { id: 'blur', name: 'ضبابية (Blur)', icon: '💨' },
  { id: 'vignette', name: 'تأطير (Vignette)', icon: '⬤' },
  { id: 'shake', name: 'اهتزاز (Shake)', icon: '📳' },
];

const TRANSITIONS: { id: TransitionType; name: string; preview: string }[] = [
  { id: 'fade', name: 'تلاشي (Fade)', preview: '◼ → ◻' },
  { id: 'slide_left', name: 'انزلاق يسار', preview: '←' },
  { id: 'slide_right', name: 'انزلاق يمين', preview: '→' },
  { id: 'zoom_in', name: 'تكبير (Zoom In)', preview: '⊕' },
  { id: 'dissolve', name: 'ذوبان (Dissolve)', preview: '⋯' },
];

export function EffectsPanel() {
  const { selectedClipId } = useSelectionStore();
  const { getClip, updateClip } = useTimelineStore();

  const clip = selectedClipId ? getClip(selectedClipId) : null;

  const applyTransition = (type: TransitionType) => {
    if (!clip) return;
    updateClip(clip.id, {
      transitions: {
        ...clip.transitions,
        in: { type, duration: 0.5, easing: 'ease_in_out' },
      },
    });
  };

  const toggleEffect = (type: EffectType) => {
    if (!clip) return;
    const exists = clip.effects.some(e => e.type === type);
    if (exists) {
      updateClip(clip.id, {
        effects: clip.effects.filter(e => e.type !== type),
      });
    } else {
      updateClip(clip.id, {
        effects: [
          ...clip.effects,
          { id: generateId('eff'), type, params: { intensity: 1 } },
        ],
      });
    }
  };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Clip Selection Status */}
      {!clip ? (
        <div style={{
          padding: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 8, fontSize: 11, color: 'var(--brand-primary)', textAlign: 'center',
        }} dir="rtl">
          💡 اضغط على أي Clip في الـ Timeline لتطبيق التأثيرات عليه
        </div>
      ) : (
        <div style={{
          padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6,
          fontSize: 11, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between',
        }}>
          <span dir="rtl">المقطع المحدد:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{clip.type} Clip</span>
        </div>
      )}

      {/* Transitions */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          انتقالات الدخول (Transitions In)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {TRANSITIONS.map(t => {
            const isActive = clip?.transitions?.in?.type === t.id;
            return (
              <button
                key={t.id}
                onClick={() => applyTransition(t.id)}
                disabled={!clip}
                style={{
                  background: isActive ? 'rgba(99,102,241,0.2)' : 'var(--bg-elevated)',
                  border: `1px solid ${isActive ? '#6366F1' : 'var(--bg-border)'}`,
                  borderRadius: 8, padding: '8px 10px',
                  cursor: clip ? 'pointer' : 'not-allowed',
                  textAlign: 'center', transition: 'all 150ms ease',
                  opacity: clip ? 1 : 0.6,
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>{t.preview}</div>
                <div style={{ fontSize: 10, color: isActive ? '#fff' : 'var(--text-secondary)' }} dir="rtl">
                  {t.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Effects */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          تأثيرات بصرية (Visual FX)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {EFFECTS.map(effect => {
            const isActive = clip?.effects.some(e => e.type === effect.id);
            return (
              <button
                key={effect.id}
                onClick={() => toggleEffect(effect.id)}
                disabled={!clip}
                style={{
                  background: isActive ? 'rgba(245,158,11,0.2)' : 'var(--bg-elevated)',
                  border: `1px solid ${isActive ? '#F59E0B' : 'var(--bg-border)'}`,
                  borderRadius: 8, padding: '8px 10px',
                  cursor: clip ? 'pointer' : 'not-allowed',
                  textAlign: 'center', transition: 'all 150ms ease',
                  opacity: clip ? 1 : 0.6,
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{effect.icon}</div>
                <div style={{ fontSize: 10, color: isActive ? '#fff' : 'var(--text-secondary)' }} dir="rtl">
                  {effect.name} {isActive && '✓'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
