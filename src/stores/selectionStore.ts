// ============================================================
// stores/selectionStore.ts — Selection & UI State
// ============================================================
import { create } from 'zustand';

export type SelectionType = 'clip' | 'track' | 'text' | 'caption' | null;

export interface SelectionState {
  selectedClipId: string | null;
  selectedTrackId: string | null;
  selectionType: SelectionType;
  hoveredClipId: string | null;
  activeTool: 'select' | 'split' | 'text' | 'zoom';

  selectClip: (clipId: string, trackId: string) => void;
  selectTrack: (trackId: string) => void;
  clearSelection: () => void;
  setHoveredClip: (clipId: string | null) => void;
  setActiveTool: (tool: SelectionState['activeTool']) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedClipId: null,
  selectedTrackId: null,
  selectionType: null,
  hoveredClipId: null,
  activeTool: 'select',

  selectClip: (clipId, trackId) => set({
    selectedClipId: clipId,
    selectedTrackId: trackId,
    selectionType: 'clip',
  }),

  selectTrack: (trackId) => set({
    selectedClipId: null,
    selectedTrackId: trackId,
    selectionType: 'track',
  }),

  clearSelection: () => set({
    selectedClipId: null,
    selectedTrackId: null,
    selectionType: null,
  }),

  setHoveredClip: (hoveredClipId) => set({ hoveredClipId }),
  setActiveTool: (activeTool) => set({ activeTool }),
}));
