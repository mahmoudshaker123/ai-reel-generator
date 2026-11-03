// ============================================================
// stores/historyStore.ts — Undo / Redo
// ============================================================
import { create } from 'zustand';
import { Project } from '@/types/timeline';
import { deepClone } from '@/lib/utils';
import { useTimelineStore } from './timelineStore';

const MAX_HISTORY = 50;

export interface HistoryState {
  restoring: boolean;
  past: Project[];
  future: Project[];
  canUndo: boolean;
  canRedo: boolean;

  pushState: (state: Project) => void;
  undo: (onUndo: (project: Project) => void) => void;
  redo: (onRedo: (project: Project) => void) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  restoring: false,
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushState: (state) => {
    set((s) => {
      const past = [...s.past, deepClone(state)].slice(-MAX_HISTORY);
      return { past, future: [], canUndo: past.length > 0, canRedo: false };
    });
  },

  undo: (onUndo) => {
    const { past, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set({
      past: newPast,
      future: [deepClone(useTimelineStore.getState().project!), ...future].slice(0, MAX_HISTORY),
      canUndo: newPast.length > 0,
      canRedo: true,
    });

    set({ restoring: true });
    onUndo(previous);
    useTimelineStore.getState().setDirty(true);
    set({ restoring: false });
  },

  redo: (onRedo) => {
    const { past, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, deepClone(useTimelineStore.getState().project!)].slice(-MAX_HISTORY),
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });

    set({ restoring: true });
    onRedo(next);
    useTimelineStore.getState().setDirty(true);
    set({ restoring: false });
  },

  clearHistory: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}));
