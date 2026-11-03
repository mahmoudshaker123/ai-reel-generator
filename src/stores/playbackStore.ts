// ============================================================
// stores/playbackStore.ts — Playback State
// ============================================================
import { create } from 'zustand';

export interface PlaybackState {
  currentTime: number;    // seconds
  isPlaying: boolean;
  volume: number;         // 0–1
  isMuted: boolean;
  playbackRate: number;   // 0.5x, 1x, 1.5x, 2x
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;

  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setLoop: (start: number, end: number) => void;
  toggleLoop: () => void;
  seekToStart: () => void;
}

export const usePlaybackStore = create<PlaybackState>()((set) => ({
  currentTime: 0,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isLooping: false,
  loopStart: 0,
  loopEnd: 0,

  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setLoop: (loopStart, loopEnd) => set({ loopStart, loopEnd }),
  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),
  seekToStart: () => set({ currentTime: 0, isPlaying: false }),
}));
