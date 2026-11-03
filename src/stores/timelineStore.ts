// ============================================================
// stores/timelineStore.ts — The Core State of the Editor
// ============================================================
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Project, Track, Clip, VideoClip, AudioClip, TextClip, ImageClip, CaptionClip,
  TrackType, DEFAULT_TRANSFORM, DEFAULT_COLOR_GRADE, DEFAULT_TEXT_STYLE,
  DEFAULT_CAPTION_STYLE, DEFAULT_EXPORT_PRESET,
} from '@/types/timeline';
import { generateId, deepClone, clamp } from '@/lib/utils';

// ─── State Interface ──────────────────────────────────────────
type NewClip = Clip extends infer C ? C extends Clip ? Omit<C, 'id' | 'trackId' | 'order'> & { order?: number } : never : never;
export interface TimelineState {
  project: Project | null;
  isDirty: boolean;      // unsaved changes
  isSaving: boolean;

  // ── Project lifecycle
  initProject: (project: Project) => void;
  newProject: (title: string) => Project;
  updateProjectMeta: (updates: Partial<Pick<Project, 'title' | 'duration' | 'fps' | 'settings'>>) => void;

  // ── Track operations
  addTrack: (type: TrackType, name?: string) => Track;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Omit<Track, 'clips' | 'id'>>) => void;
  reorderTrack: (trackId: string, newOrder: number) => void;

  // ── Clip operations
  addClip: (trackId: string, clip: NewClip) => Clip;
  updateClip: <T extends Clip>(clipId: string, updates: Partial<T>) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  trimClip: (clipId: string, trimStart: number, trimEnd: number) => void;
  splitClip: (clipId: string, atTime: number) => [Clip, Clip] | null;
  duplicateClip: (clipId: string) => Clip | null;

  // ── Computed helpers
  getTrack: (trackId: string) => Track | undefined;
  getClip: (clipId: string) => Clip | undefined;
  getClipsAtTime: (time: number) => Clip[];
  getTrackClips: (trackId: string) => Clip[];
  computeProjectDuration: () => number;

  // ── Serialization
  toJSON: () => Project | null;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────
function createDefaultProject(title: string): Project {
  const videoTrack: Track = {
    id: generateId('track'),
    type: 'video',
    name: 'Video',
    order: 0,
    locked: false,
    muted: false,
    hidden: false,
    clips: [],
  };
  const audioTrack: Track = {
    id: generateId('track'),
    type: 'audio',
    name: 'Audio',
    order: 1,
    locked: false,
    muted: false,
    hidden: false,
    clips: [],
  };
  const captionTrack: Track = {
    id: generateId('track'),
    type: 'caption',
    name: 'Captions',
    order: 2,
    locked: false,
    muted: false,
    hidden: false,
    clips: [],
  };
  return {
    id: generateId('proj'),
    version: 1,
    title,
    duration: 0,
    fps: 30,
    width: 1080,
    height: 1920,
    tracks: [videoTrack, audioTrack, captionTrack],
    globalAudio: { masterVolume: 1 },
    settings: {
      backgroundColor: '#000000',
      exportPreset: DEFAULT_EXPORT_PRESET,
    },
    updatedAt: new Date().toISOString(),
  };
}

function recomputeDuration(project: Project): number {
  let max = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const end = clip.startTime + clip.duration;
      if (end > max) max = end;
    }
  }
  return max;
}

// ─── Store ────────────────────────────────────────────────────
export const useTimelineStore = create<TimelineState>()(
  subscribeWithSelector((set, get) => ({
    project: null,
    isDirty: false,
    isSaving: false,

    // ──── Project lifecycle ─────────────────────────────────
    initProject: (project) => set({ project: deepClone(project), isDirty: false }),

    newProject: (title) => {
      const project = createDefaultProject(title);
      set({ project, isDirty: true });
      return project;
    },

    updateProjectMeta: (updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    }),

    // ──── Track operations ──────────────────────────────────
    addTrack: (type, name) => {
      const track: Track = {
        id: generateId('track'),
        type,
        name: name ?? type.charAt(0).toUpperCase() + type.slice(1),
        order: get().project?.tracks.length ?? 0,
        locked: false,
        muted: false,
        hidden: false,
        clips: [],
      };
      set((state) => {
        if (!state.project) return state;
        return {
          project: {
            ...state.project,
            tracks: [...state.project.tracks, track],
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      });
      return track;
    },

    removeTrack: (trackId) => set((state) => {
      if (!state.project) return state;
      const tracks = state.project.tracks.filter(t => t.id !== trackId);
      const project = { ...state.project, tracks, updatedAt: new Date().toISOString() };
      return { project: { ...project, duration: recomputeDuration(project) }, isDirty: true };
    }),

    updateTrack: (trackId, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId ? { ...t, ...updates } : t
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    }),

    reorderTrack: (trackId, newOrder) => set((state) => {
      if (!state.project) return state;
      const tracks = [...state.project.tracks];
      const idx = tracks.findIndex(t => t.id === trackId);
      if (idx === -1) return state;
      const [track] = tracks.splice(idx, 1);
      tracks.splice(newOrder, 0, track);
      return {
        project: {
          ...state.project,
          tracks: tracks.map((t, i) => ({ ...t, order: i })),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    }),

    // ──── Clip operations ───────────────────────────────────
    addClip: (trackId, clipData) => {
      const track = get().project?.tracks.find(t => t.id === trackId);
      const clip: Clip = {
        ...clipData,
        id: generateId('clip'),
        trackId,
        order: track?.clips.length ?? 0,
      } as Clip;

      set((state) => {
        if (!state.project) return state;
        const tracks = state.project.tracks.map(t => {
          if (t.id !== trackId) return t;
          return { ...t, clips: [...t.clips, clip] };
        });
        const project = { ...state.project, tracks, updatedAt: new Date().toISOString() };
        return {
          project: { ...project, duration: recomputeDuration(project) },
          isDirty: true,
        };
      });
      return clip;
    },

    updateClip: (clipId, updates) => set((state) => {
      if (!state.project) return state;
      const tracks = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        ),
      }));
      const project = { ...state.project, tracks, updatedAt: new Date().toISOString() };
      return {
        project: { ...project, duration: recomputeDuration(project) },
        isDirty: true,
      };
    }),

    removeClip: (clipId) => set((state) => {
      if (!state.project) return state;
      const tracks = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(c => c.id !== clipId),
      }));
      const project = { ...state.project, tracks, updatedAt: new Date().toISOString() };
      return {
        project: { ...project, duration: recomputeDuration(project) },
        isDirty: true,
      };
    }),

    moveClip: (clipId, newStartTime, newTrackId) => set((state) => {
      if (!state.project) return state;
      let movedClip: Clip | undefined;

      // Remove from current track
      let tracks = state.project.tracks.map(track => {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) movedClip = { ...clip, startTime: clamp(newStartTime, 0, 9999) };
        return { ...track, clips: track.clips.filter(c => c.id !== clipId) };
      });

      if (!movedClip) return state;

      // Add to new track (or same track)
      const targetTrackId = newTrackId ?? movedClip.trackId;
      movedClip = { ...movedClip, trackId: targetTrackId };

      tracks = tracks.map(track => {
        if (track.id !== targetTrackId) return track;
        return { ...track, clips: [...track.clips, movedClip!] };
      });

      const project = { ...state.project, tracks, updatedAt: new Date().toISOString() };
      return {
        project: { ...project, duration: recomputeDuration(project) },
        isDirty: true,
      };
    }),

    trimClip: (clipId, trimStart, trimEnd) => set((state) => {
      if (!state.project) return state;
      const tracks = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id !== clipId) return clip;
          if (clip.type === 'video' || clip.type === 'audio') {
            const newDuration = (trimEnd - trimStart) / (clip.type === 'video' ? (clip.playbackSpeed || 1) : 1);
            return {
              ...clip,
              trimStart,
              trimEnd,
              duration: newDuration,
            };
          }
          return clip;
        }),
      }));
      const project = { ...state.project, tracks, updatedAt: new Date().toISOString() };
      return {
        project: { ...project, duration: recomputeDuration(project) },
        isDirty: true,
      };
    }),

    splitClip: (clipId, atTime) => {
      const state = get();
      if (!state.project) return null;

      let originalClip: Clip | undefined;
      let trackId: string | undefined;

      for (const track of state.project.tracks) {
        const found = track.clips.find(c => c.id === clipId);
        if (found) { originalClip = found; trackId = track.id; break; }
      }

      if (!originalClip || !trackId) return null;
      if (atTime <= originalClip.startTime || atTime >= originalClip.startTime + originalClip.duration) return null;

      const splitPoint = atTime - originalClip.startTime;

      // Part 1: from original start → splitPoint
      const clip1: Clip = deepClone(originalClip);
      clip1.duration = splitPoint;

      // Part 2: from splitPoint → original end
      const clip2: Clip = deepClone(originalClip);
      clip2.id = generateId('clip');
      clip2.startTime = atTime;
      clip2.duration = originalClip.duration - splitPoint;

      if ((clip1.type === 'video' || clip1.type === 'audio') &&
          (clip2.type === 'video' || clip2.type === 'audio')) {
        const c1 = clip1 as VideoClip | AudioClip;
        const c2 = clip2 as VideoClip | AudioClip;
        const speed = c1.type === 'video' ? c1.playbackSpeed : 1;
        c2.trimStart = c1.trimStart + splitPoint * speed;
        c1.trimEnd = c2.trimStart;
      }

      set((s) => {
        if (!s.project) return s;
        const tracks = s.project.tracks.map(track => {
          if (track.id !== trackId) return track;
          const clips = track.clips.filter(c => c.id !== clipId);
          return { ...track, clips: [...clips, clip1, clip2] };
        });
        const project = { ...s.project, tracks, updatedAt: new Date().toISOString() };
        return {
          project: { ...project, duration: recomputeDuration(project) },
          isDirty: true,
        };
      });

      return [clip1, clip2];
    },

    duplicateClip: (clipId) => {
      const state = get();
      if (!state.project) return null;

      let original: Clip | undefined;
      let trackId: string | undefined;
      for (const track of state.project.tracks) {
        const found = track.clips.find(c => c.id === clipId);
        if (found) { original = found; trackId = track.id; break; }
      }
      if (!original || !trackId) return null;

      const dupe: Clip = {
        ...deepClone(original),
        id: generateId('clip'),
        startTime: original.startTime + original.duration + 0.1,
      };

      set((s) => {
        if (!s.project) return s;
        const tracks = s.project.tracks.map(track => {
          if (track.id !== trackId) return track;
          return { ...track, clips: [...track.clips, dupe] };
        });
        const project = { ...s.project, tracks, updatedAt: new Date().toISOString() };
        return {
          project: { ...project, duration: recomputeDuration(project) },
          isDirty: true,
        };
      });

      return dupe;
    },

    // ──── Computed helpers ──────────────────────────────────
    getTrack: (trackId) => get().project?.tracks.find(t => t.id === trackId),

    getClip: (clipId) => {
      for (const track of get().project?.tracks ?? []) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) return clip;
      }
    },

    getClipsAtTime: (time) => {
      const clips: Clip[] = [];
      for (const track of get().project?.tracks ?? []) {
        if (track.hidden || track.muted) continue;
        for (const clip of track.clips) {
          if (time >= clip.startTime && time < clip.startTime + clip.duration) {
            clips.push(clip);
          }
        }
      }
      return clips;
    },

    getTrackClips: (trackId) => {
      return get().project?.tracks.find(t => t.id === trackId)?.clips ?? [];
    },

    computeProjectDuration: () => {
      const project = get().project;
      if (!project) return 0;
      return recomputeDuration(project);
    },

    // ──── Serialization ─────────────────────────────────────
    toJSON: () => get().project ? deepClone(get().project!) : null,

    setDirty: (dirty) => set({ isDirty: dirty }),
    setSaving: (saving) => set({ isSaving: saving }),
  }))
);
