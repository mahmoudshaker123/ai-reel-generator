'use client';

import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { EditorToolbar } from './toolbar/EditorToolbar';
import { LeftPanel } from './panels/LeftPanel';
import { PreviewArea } from './preview/PreviewArea';
import { RightPanel } from './inspector/RightPanel';
import { Timeline } from './timeline/Timeline';
import { ExportModal } from './modals/ExportModal';

export function EditorLayout() {
  const { isLeftPanelOpen, isRightPanelOpen, timelineHeight } = useUIStore();
  const { splitClip, removeClip, duplicateClip } = useTimelineStore();
  const { togglePlay, setCurrentTime, currentTime } = usePlaybackStore();
  const { selectedClipId, clearSelection } = useSelectionStore();

  // ── Keyboard shortcuts ─────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
    if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      const history = useHistoryStore.getState();
      const restore = useTimelineStore.getState().initProject;
      if (e.key.toLowerCase() === 'y' || e.shiftKey) history.redo(restore); else history.undo(restore);
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;

      case 'Delete':
      case 'Backspace':
        if (selectedClipId) {
          e.preventDefault();
          removeClip(selectedClipId);
          clearSelection();
        }
        break;

      case 's':
      case 'S':
        if (!e.ctrlKey && !e.metaKey && selectedClipId) {
          e.preventDefault();
          splitClip(selectedClipId, currentTime);
        }
        break;

      case 'd':
      case 'D':
        if (e.ctrlKey || e.metaKey) {
          if (selectedClipId) {
            e.preventDefault();
            duplicateClip(selectedClipId);
          }
        }
        break;

      case 'Home':
        e.preventDefault();
        setCurrentTime(0);
        break;
    }
  }, [togglePlay, splitClip, removeClip, duplicateClip, selectedClipId, clearSelection, currentTime, setCurrentTime]);

  useEffect(() => {
    let lastRecorded = 0;
    return useTimelineStore.subscribe((next, previous) => {
      if (!next.isDirty || next.project === previous.project || !previous.project ||
          next.project?.id !== previous.project.id || useHistoryStore.getState().restoring) return;
      const now = Date.now();
      if (now - lastRecorded > 250) useHistoryStore.getState().pushState(previous.project);
      lastRecorded = now;
    });
  }, []);

  useEffect(() => {
    if (window.innerWidth < 760) {
      useUIStore.setState({ isLeftPanelOpen: false, isRightPanelOpen: false });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Compute panel states ────────────────────────────────
  const leftClass = !isLeftPanelOpen ? 'left-closed' : '';
  const rightClass = !isRightPanelOpen ? 'right-closed' : '';
  const bothClass = !isLeftPanelOpen && !isRightPanelOpen ? 'both-closed' : '';
  const layoutClass = `editor-layout ${bothClass || `${leftClass} ${rightClass}`}`.trim();

  return (
    <div
      className={layoutClass}
      style={{
        '--timeline-height': `${timelineHeight}px`,
      } as React.CSSProperties}
    >
      {/* Row 1: Toolbar */}
      <EditorToolbar />

      {/* Row 2: Left Panel */}
      {isLeftPanelOpen && <LeftPanel />}

      {/* Row 2: Preview */}
      <PreviewArea />

      {/* Row 2: Right Panel */}
      {isRightPanelOpen && <RightPanel />}

      {/* Row 3: Timeline */}
      <Timeline />

      {/* Export Modal */}
      <ExportModal />
    </div>
  );
}
