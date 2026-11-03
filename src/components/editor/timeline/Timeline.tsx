'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useUIStore } from '@/stores/uiStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { TimelineRuler } from './TimelineRuler';
import { TrackRow } from './TrackRow';
import { Playhead } from './Playhead';
import { TimelineControls } from './TimelineControls';
import { ZoomIn, ZoomOut, Plus, Scissors, Trash2, Copy, Captions, Type } from 'lucide-react';
import { DEFAULT_CAPTION_STYLE, DEFAULT_TRANSFORM } from '@/types/timeline';

export function Timeline() {
  const { project, splitClip, removeClip, duplicateClip, addClip, addTrack } = useTimelineStore();
  const { currentTime, setCurrentTime } = usePlaybackStore();
  const { timelineZoom, setTimelineZoom, timelineHeight } = useUIStore();
  const { selectedClipId, clearSelection, selectClip } = useSelectionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Timeline clip action handlers ─────────────────────────
  const handleSplit = () => {
    if (selectedClipId) splitClip(selectedClipId, currentTime);
  };

  const handleDelete = () => {
    if (selectedClipId) {
      removeClip(selectedClipId);
      clearSelection();
    }
  };

  const handleDuplicate = () => {
    if (selectedClipId) duplicateClip(selectedClipId);
  };

  const handleAddCaption = () => {
    if (!project) return;
    let capTrack = project.tracks.find(t => t.type === 'caption');
    if (!capTrack) {
      capTrack = addTrack('caption', 'كابشن');
    }
    const newClip = addClip(capTrack.id, {
      type: 'caption',
      startTime: currentTime,
      duration: 3.0,
      order: capTrack.clips.length,
      locked: false,
      effects: [], animations: [], transitions: {},
      animationType: 'word_by_word',
      segments: [
        {
          id: `seg_${Date.now()}`,
          text: 'اكتب الكابشن هنا',
          startTime: 0,
          endTime: 3.0,
          words: [
            { word: 'اكتب', startTime: 0, endTime: 1.0 },
            { word: 'الكابشن', startTime: 1.0, endTime: 2.0 },
            { word: 'هنا', startTime: 2.0, endTime: 3.0 },
          ],
        },
      ],
      style: {
        preset: 'highlight',
        fontFamily: 'Cairo',
        fontSize: 64,
        fontWeight: '900',
        fontStyle: 'normal',
        color: '#FFFF00',
        backgroundColor: '#000000',
        backgroundOpacity: 0.8,
        backgroundPadding: 14,
        backgroundBorderRadius: 12,
        stroke: { color: '#000000', width: 3 },
        shadow: { color: 'rgba(0,0,0,0.9)', offsetX: 0, offsetY: 6, blur: 16 },
        textAlign: 'center',
        lineHeight: 1.3,
        letterSpacing: 0,
        direction: 'rtl',
        maxWordsPerLine: 4,
        showBackground: true,
        animationIn: 'pop',
      },
      transform: {
        ...DEFAULT_TRANSFORM,
        y: 150,
      },
    });
    selectClip(newClip.id, capTrack.id);
  };

  // ── Timeline width ────────────────────────────────────────
  const totalDuration = Math.max(project?.duration ?? 0, 30); // min 30s visible
  const timelineWidth = totalDuration * timelineZoom + 300; // extra padding

  // ── Seek on ruler click ───────────────────────────────────
  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const clickX = e.clientX - rect.left + scrollLeft;
    const time = clickX / timelineZoom;
    setCurrentTime(Math.max(0, time));
  }, [timelineZoom, setCurrentTime]);

  // ── Zoom with scroll wheel ────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setTimelineZoom(timelineZoom + delta);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [timelineZoom, setTimelineZoom]);

  // Ensure scroll is at 0:00 when project loads
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [project?.id]);

  if (!project) return null;

  return (
    <div className="editor-timeline" dir="ltr">
      {/* ── Timeline toolbar ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderBottom: '1px solid var(--bg-border)',
        background: 'var(--bg-surface)', flexShrink: 0, minHeight: 36, overflowX: 'auto',
      }}>
        {/* Quick Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Split */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleSplit}
            disabled={!selectedClipId}
            title="قص المقطع عند المؤشر (مفتاح S)"
            style={{
              gap: 4, height: 26, fontSize: 11, padding: '0 8px',
              opacity: selectedClipId ? 1 : 0.4,
              cursor: selectedClipId ? 'pointer' : 'not-allowed',
            }}
          >
            <Scissors size={12} color="#818CF8" />
            <span>قص (S)</span>
          </button>

          {/* Delete */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            disabled={!selectedClipId}
            title="حذف الجزء المحدد (مفتاح Delete أو Backspace)"
            style={{
              gap: 4, height: 26, fontSize: 11, padding: '0 8px',
              color: selectedClipId ? '#EF4444' : 'var(--text-muted)',
              opacity: selectedClipId ? 1 : 0.4,
              cursor: selectedClipId ? 'pointer' : 'not-allowed',
            }}
          >
            <Trash2 size={12} color={selectedClipId ? '#EF4444' : 'currentColor'} />
            <span>حذف (Del)</span>
          </button>

          {/* Duplicate */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDuplicate}
            disabled={!selectedClipId}
            title="تكرار المقطع (Ctrl+D)"
            style={{
              gap: 4, height: 26, fontSize: 11, padding: '0 8px',
              opacity: selectedClipId ? 1 : 0.4,
              cursor: selectedClipId ? 'pointer' : 'not-allowed',
            }}
          >
            <Copy size={12} />
            <span>تكرار</span>
          </button>

          <div style={{ width: 1, height: 16, background: 'var(--bg-border)', margin: '0 4px' }} />

          {/* Add Caption Button */}
          <button
            className="btn btn-surface btn-sm"
            onClick={handleAddCaption}
            title="إضافة شريط كابشن عند المؤشر الحالي"
            style={{
              gap: 5, height: 26, fontSize: 11, padding: '0 10px',
              borderRadius: 6, borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34D399', background: 'rgba(16, 185, 129, 0.1)',
            }}
          >
            <Captions size={13} color="#10B981" />
            <span>+ كابشن</span>
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => setTimelineZoom(timelineZoom - 20)}
          title="Zoom out"
        >
          <ZoomOut size={13} />
        </button>
        <div style={{
          fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'center',
        }}>
          {Math.round(timelineZoom)}px
        </div>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => setTimelineZoom(timelineZoom + 20)}
          title="Zoom in"
        >
          <ZoomIn size={13} />
        </button>
      </div>

      {/* ── Timeline body ─────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Track labels column */}
        <div style={{
          width: 160, minWidth: 160, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--bg-border)',
          background: 'var(--bg-panel)',
        }}>
          {/* Ruler space */}
          <div style={{ height: 28, borderBottom: '1px solid var(--bg-border)' }} />
          {/* Track labels */}
          {project.tracks
            .sort((a, b) => a.order - b.order)
            .map(track => (
              <TimelineControls key={track.id} track={track} />
            ))
          }
        </div>

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}
        >
          <div style={{ width: timelineWidth, position: 'relative' }}>
            {/* Ruler */}
            <TimelineRuler
              zoom={timelineZoom}
              duration={totalDuration}
              onClick={handleRulerClick}
            />

            {/* Playhead */}
            <Playhead
              currentTime={currentTime}
              zoom={timelineZoom}
              totalHeight={project.tracks.length * 56 + 28}
            />

            {/* Tracks */}
            <div>
              {project.tracks
                .sort((a, b) => a.order - b.order)
                .map(track => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    zoom={timelineZoom}
                    scrollRef={scrollRef}
                  />
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
