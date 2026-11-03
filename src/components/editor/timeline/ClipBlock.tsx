'use client';

import { useRef, useState, useCallback, RefObject } from 'react';
import { Clip, Track, VideoClip, AudioClip } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { clamp, pixelsToTime, truncate } from '@/lib/utils';
import { Trash2, Scissors, Copy } from 'lucide-react';

const CLIP_TYPE_CLASSES: Record<string, string> = {
  video: 'clip-block--video',
  audio: 'clip-block--audio',
  text: 'clip-block--text',
  caption: 'clip-block--caption',
  image: 'clip-block--image',
  effect: 'clip-block--effect',
};

function getClipLabel(clip: Clip): string {
  if (clip.type === 'video') return (clip as VideoClip).mediaUrl.split('/').pop() ?? 'Video';
  if (clip.type === 'audio') return (clip as AudioClip).label ?? 'Audio';
  if (clip.type === 'text') return truncate(clip.content, 20);
  if (clip.type === 'caption') return 'Captions';
  if (clip.type === 'image') return 'Image';
  return 'Clip';
}

interface ClipBlockProps {
  clip: Clip;
  track: Track;
  zoom: number;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function ClipBlock({ clip, track, zoom, scrollRef }: ClipBlockProps) {
  const { moveClip, trimClip, removeClip, project, initProject } = useTimelineStore();
  const { selectedClipId, selectClip, clearSelection } = useSelectionStore();
  const { pushState } = useHistoryStore();

  const isSelected = selectedClipId === clip.id;
  const blockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimming, setIsTrimming] = useState<'left' | 'right' | null>(null);
  const dragStart = useRef<{ x: number; clipStartTime: number }>({ x: 0, clipStartTime: 0 });
  const trimStart = useRef<{ x: number; originalTrimStart: number; originalTrimEnd: number; originalDuration: number; originalStartTime: number }>({
    x: 0, originalTrimStart: 0, originalTrimEnd: 0, originalDuration: 0, originalStartTime: 0,
  });

  const left = clip.startTime * zoom;
  const width = Math.max(clip.duration * zoom, 8);

  // ── Click to select ──────────────────────────────────────
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && !isTrimming) {
      selectClip(clip.id, track.id);
    }
  };

  // ── Drag to move ─────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (track.locked) return;
    if ((e.target as HTMLElement).classList.contains('clip-block__handle')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, clipStartTime: clip.startTime };



    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - dragStart.current.x;
      const dt = pixelsToTime(dx, zoom);
      const newStart = clamp(dragStart.current.clipStartTime + dt, 0, 9999);
      moveClip(clip.id, newStart);
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [clip, track, zoom, moveClip, project, pushState]);

  // ── Trim handles ─────────────────────────────────────────
  const handleTrimStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    if (track.locked) return;
    e.preventDefault();
    e.stopPropagation();
    setIsTrimming(side);



    const isVideo = clip.type === 'video' || clip.type === 'audio';
    const vc = clip as VideoClip | AudioClip;

    trimStart.current = {
      x: e.clientX,
      originalTrimStart: isVideo ? vc.trimStart : 0,
      originalTrimEnd: isVideo ? vc.trimEnd : clip.duration,
      originalDuration: clip.duration,
      originalStartTime: clip.startTime,
    };

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - trimStart.current.x;
      const dt = pixelsToTime(dx, zoom);

      if (side === 'left') {
        const newTrimStart = clamp(
          trimStart.current.originalTrimStart + dt,
          0,
          trimStart.current.originalTrimEnd - 0.1
        );
        const diff = (newTrimStart - trimStart.current.originalTrimStart) / (isVideo && vc.type === 'video' ? (vc.playbackSpeed || 1) : 1);
        trimClip(clip.id, newTrimStart, trimStart.current.originalTrimEnd);
        // Also update start time
        moveClip(clip.id, trimStart.current.originalStartTime + diff);
      } else {
        const newTrimEnd = clamp(
          trimStart.current.originalTrimEnd + dt,
          trimStart.current.originalTrimStart + 0.1,
          (isVideo ? vc.trimEnd + 999 : Infinity)
        );
        trimClip(clip.id, trimStart.current.originalTrimStart, newTrimEnd);
      }
    };

    const onUp = () => {
      setIsTrimming(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [clip, track, zoom, trimClip, moveClip, project, pushState]);

  // ── Context menu (right click) ───────────────────────────
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    selectClip(clip.id, track.id);
    // TODO: show context menu
  };

  return (
    <div
      ref={blockRef}
      className={`clip-block ${CLIP_TYPE_CLASSES[clip.type] ?? ''} ${isSelected ? 'selected' : ''}`}
      style={{
        left,
        width: Math.max(width, 8),
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: track.hidden ? 0.4 : 1,
      }}
      onClick={handleClick}
      onMouseDown={handleDragStart}
      onContextMenu={handleContextMenu}
    >
      {/* Left trim handle */}
      <div
        className="clip-block__handle clip-block__handle--left"
        onMouseDown={(e) => handleTrimStart(e, 'left')}
        title="Trim start"
      />

      {/* Label */}
      {width > 30 && (
        <span className="clip-block__label" style={{ marginLeft: 10 }}>
          {getClipLabel(clip)}
        </span>
      )}

      {/* Waveform placeholder for audio */}
      {clip.type === 'audio' && width > 40 && (
        <div style={{
          position: 'absolute', inset: '8px 8px',
          opacity: 0.4, display: 'flex', alignItems: 'center', gap: 1,
        }}>
          {Array.from({ length: Math.floor(width / 4) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 2, flex: '0 0 2px',
                height: `${30 + Math.sin(i * 0.8) * 20}%`,
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      )}

      {/* Right trim handle */}
      <div
        className="clip-block__handle clip-block__handle--right"
        onMouseDown={(e) => handleTrimStart(e, 'right')}
        title="Trim end"
      />

      {/* Quick delete button on top-right of selected clip */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeClip(clip.id);
            clearSelection();
          }}
          style={{
            position: 'absolute', top: 3, right: 3, zIndex: 12,
            width: 16, height: 16, borderRadius: '50%',
            background: '#EF4444', color: '#fff',
            border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
          title="حذف هذا الجزء (Delete)"
        >
          <Trash2 size={9} />
        </button>
      )}
    </div>
  );
}
