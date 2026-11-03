'use client';

import { useRef, useState, useCallback, RefObject } from 'react';
import { Track, Clip } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { ClipBlock } from './ClipBlock';
import { pixelsToTime, clamp } from '@/lib/utils';

interface TrackRowProps {
  track: Track;
  zoom: number;     // pixels per second
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function TrackRow({ track, zoom, scrollRef }: TrackRowProps) {
  const { addClip } = useTimelineStore();
  const { selectClip, clearSelection } = useSelectionStore();
  const rowRef = useRef<HTMLDivElement>(null);

  // ── Drop handler (for media dropped from left panel) ────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/reel-media');
    if (!data) return;

    try {
      const media = JSON.parse(data);
      if (track.locked) return;

      const rect = rowRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
      const dropX = e.clientX - rect.left + scrollLeft;
      const dropTime = clamp(pixelsToTime(dropX, zoom), 0, 9999);

      if (media.type === 'video' && track.type === 'video') {
        addClip(track.id, {
          type: 'video',
          mediaFileId: media.id,
          mediaUrl: media.url,
          thumbnailUrl: media.thumbnailUrl,
          startTime: dropTime,
          duration: media.duration ?? 10,
          trimStart: 0,
          trimEnd: media.duration ?? 10,
          transform: {
            x: 0, y: 0, width: 100, height: 100,
            rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
            cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
          },
          volume: 1, muted: false,
          audioFade: { fadeIn: 0, fadeOut: 0 },
          playbackSpeed: 1,
          colorGrade: { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0, vignette: 0 },
          effects: [], animations: [],
          transitions: {},
          order: track.clips.length,
          locked: false,
        });
      } else if (media.type === 'audio' && track.type === 'audio') {
        const duration = media.duration ?? 10;
        addClip(track.id, {
          type: 'audio', mediaFileId: media.id, mediaUrl: media.url,
          startTime: dropTime, duration, trimStart: 0, trimEnd: duration,
          volume: 1, muted: false, audioFade: { fadeIn: 0, fadeOut: 0 },
          label: 'background_music', locked: false, effects: [], animations: [], transitions: {},
          order: track.clips.length,
        });
      } else if (media.type === 'image' && track.type === 'image') {
        const duration = 5;
        addClip(track.id, {
          type: 'image', mediaFileId: media.id, mediaUrl: media.url,
          startTime: dropTime, duration, locked: false, effects: [], animations: [], transitions: {},
          order: track.clips.length,
          transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 },
        });
      }
    } catch {
      // invalid drop data
    }
  }, [track, zoom, addClip, scrollRef]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // ── Row click (deselect) ─────────────────────────────────
  const handleRowClick = (e: React.MouseEvent) => {
    if (e.target === rowRef.current) clearSelection();
  };

  return (
    <div
      ref={rowRef}
      className="timeline-track-row"
      style={{
        height: 56,
        position: 'relative',
        background: track.hidden ? 'rgba(0,0,0,0.3)' : undefined,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleRowClick}
    >
      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${zoom}px, var(--bg-border) ${zoom}px, var(--bg-border) ${zoom + 1}px)`,
        opacity: 0.3, pointerEvents: 'none',
      }} />

      {/* Clips */}
      {track.clips.map(clip => (
        <ClipBlock
          key={clip.id}
          clip={clip}
          track={track}
          zoom={zoom}
          scrollRef={scrollRef}
        />
      ))}
    </div>
  );
}
