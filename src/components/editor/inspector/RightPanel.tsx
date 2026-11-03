'use client';

import { useSelectionStore } from '@/stores/selectionStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { VideoClip, TextClip, AudioClip, CaptionClip } from '@/types/timeline';
import { VideoInspector } from './VideoInspector';
import { TextInspector } from './TextInspector';
import { AudioInspector } from './AudioInspector';
import { CaptionInspector } from './CaptionInspector';
import { ImageInspector } from './ImageInspector';
import { MousePointer2 } from 'lucide-react';

export function RightPanel() {
  const { selectedClipId } = useSelectionStore();
  const { getClip } = useTimelineStore();

  const clip = selectedClipId ? getClip(selectedClipId) : null;

  return (
    <div className="editor-right-panel" style={{ padding: 12 }}>
      {!clip ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text-muted)',
          padding: '40px 0',
        }}>
          <MousePointer2 size={24} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 12, textAlign: 'center' }} dir="rtl">
            اختر عنصراً في الـ Timeline<br />لتعديل خصائصه
          </p>
        </div>
      ) : (
        <div className="animate-fade-in">
          {clip.type === 'video' && <VideoInspector clip={clip as VideoClip} />}
          {clip.type === 'text' && <TextInspector clip={clip as TextClip} />}
          {clip.type === 'audio' && <AudioInspector clip={clip as AudioClip} />}
          {clip.type === 'caption' && <CaptionInspector clip={clip as CaptionClip} />}
          {clip.type === 'image' && <ImageInspector clip={clip} />}
        </div>
      )}
    </div>
  );
}
