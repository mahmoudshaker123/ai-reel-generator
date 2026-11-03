// ============================================================
// stores/uiStore.ts — UI Panel & Timeline View State
// ============================================================
import { create } from 'zustand';

export type LeftPanelTab = 'media' | 'text' | 'audio' | 'captions' | 'effects' | 'ai';

export interface UIState {
  // Left panel
  activeLeftTab: LeftPanelTab;
  isLeftPanelOpen: boolean;

  // Right panel
  isRightPanelOpen: boolean;

  // Timeline
  timelineZoom: number;      // pixels per second (default 80)
  timelineScrollLeft: number;
  timelineHeight: number;    // px

  // Modals
  isExportModalOpen: boolean;
  isAIModalOpen: boolean;
  isUploadModalOpen: boolean;

  // State
  isFullscreen: boolean;

  setActiveLeftTab: (tab: LeftPanelTab) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setTimelineZoom: (zoom: number) => void;
  setTimelineScrollLeft: (scroll: number) => void;
  setTimelineHeight: (height: number) => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openAIModal: () => void;
  closeAIModal: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  toggleFullscreen: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeLeftTab: 'media',
  isLeftPanelOpen: true,
  isRightPanelOpen: true,
  timelineZoom: 80,       // 80px = 1 second
  timelineScrollLeft: 0,
  timelineHeight: 220,
  isExportModalOpen: false,
  isAIModalOpen: false,
  isUploadModalOpen: false,
  isFullscreen: false,

  setActiveLeftTab: (activeLeftTab) => set({ activeLeftTab }),
  toggleLeftPanel: () => set((s) => ({ isLeftPanelOpen: !s.isLeftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  setTimelineZoom: (timelineZoom) => set({ timelineZoom: Math.min(400, Math.max(20, timelineZoom)) }),
  setTimelineScrollLeft: (timelineScrollLeft) => set({ timelineScrollLeft }),
  setTimelineHeight: (timelineHeight) => set({ timelineHeight }),
  openExportModal: () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),
  openAIModal: () => set({ isAIModalOpen: true }),
  closeAIModal: () => set({ isAIModalOpen: false }),
  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
}));
