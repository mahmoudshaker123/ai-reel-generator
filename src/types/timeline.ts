// ============================================================
// Timeline Types — Source of Truth for the entire editor
// ============================================================

export type TrackType = 'video' | 'audio' | 'text' | 'caption' | 'image' | 'effect';

export type TransitionType =
  | 'none'
  | 'fade'
  | 'slide_left'
  | 'slide_right'
  | 'zoom_in'
  | 'zoom_out'
  | 'dissolve'
  | 'wipe';

export type EffectType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'blur'
  | 'zoom_in'
  | 'zoom_out'
  | 'shake'
  | 'vignette';

export type EasingType = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';

// ─── Transform ────────────────────────────────────────────────
export interface Transform2D {
  x: number;          // pixels from center-x
  y: number;          // pixels from center-y
  width: number;      // % of canvas width (0–100)
  height: number;     // % of canvas height (0–100)
  rotation: number;   // degrees
  scaleX: number;
  scaleY: number;
  opacity: number;    // 0–1
  cropTop: number;    // 0–1
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

// ─── Audio ────────────────────────────────────────────────────
export interface AudioFade {
  fadeIn: number;    // seconds
  fadeOut: number;   // seconds
}

// ─── Color ────────────────────────────────────────────────────
export interface ColorGrade {
  brightness: number;   // -1 to 1
  contrast: number;     // -1 to 1
  saturation: number;   // -1 to 1
  hue: number;          // -180 to 180
  temperature: number;  // -1 to 1 (warm/cool)
  vignette: number;     // 0 to 1
}

// ─── Text ─────────────────────────────────────────────────────
export interface Stroke {
  color: string;
  width: number;
}

export interface Shadow {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundBorderRadius: number;
  stroke: Stroke;
  shadow: Shadow;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  direction: 'ltr' | 'rtl';
}

// ─── Captions ─────────────────────────────────────────────────
export interface CaptionWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  highlightColor?: string;
}

export interface CaptionSegment {
  id: string;
  text: string;
  startTime: number;  // relative to clip startTime
  endTime: number;
  words: CaptionWord[];
}

export interface CaptionStyle extends TextStyle {
  preset: 'minimal' | 'bold' | 'highlight' | 'karaoke' | 'custom';
  maxWordsPerLine: number;
  showBackground: boolean;
  animationIn: 'none' | 'fade' | 'slide_up' | 'pop';
}

export type CaptionAnimationType = 'word_by_word' | 'sentence' | 'karaoke';

// ─── Transition ───────────────────────────────────────────────
export interface Transition {
  type: TransitionType;
  duration: number;
  easing: EasingType;
}

// ─── Effects & Animations ─────────────────────────────────────
export interface Effect {
  id: string;
  type: EffectType;
  params: Record<string, number>;
}

export interface Keyframe {
  time: number;
  value: number;
  easing: EasingType;
}

export interface Animation {
  property: 'x' | 'y' | 'scaleX' | 'scaleY' | 'opacity' | 'rotation';
  keyframes: Keyframe[];
}

// ─── Clips ────────────────────────────────────────────────────
export interface BaseClip {
  id: string;
  trackId: string;
  startTime: number;    // position on timeline (seconds)
  duration: number;     // duration on timeline (seconds)
  order: number;
  locked: boolean;
  effects: Effect[];
  animations: Animation[];
  transitions: {
    in?: Transition;
    out?: Transition;
  };
}

export interface VideoClip extends BaseClip {
  type: 'video';
  mediaFileId: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  trimStart: number;    // source video start (seconds)
  trimEnd: number;      // source video end (seconds)
  transform: Transform2D;
  volume: number;       // 0–1
  muted: boolean;
  audioFade: AudioFade;
  playbackSpeed: number;
  colorGrade: ColorGrade;
}

export interface AudioClip extends BaseClip {
  type: 'audio';
  mediaFileId: string;
  mediaUrl: string;
  trimStart: number;
  trimEnd: number;
  volume: number;
  muted: boolean;
  audioFade: AudioFade;
  label: 'background_music' | 'voiceover' | 'sfx';
}

export interface TextClip extends BaseClip {
  type: 'text';
  content: string;
  style: TextStyle;
  transform: Transform2D;
}

export interface ImageClip extends BaseClip {
  type: 'image';
  mediaFileId: string;
  mediaUrl: string;
  transform: Transform2D;
}

export interface CaptionClip extends BaseClip {
  type: 'caption';
  captionSourceId?: string;
  segments: CaptionSegment[];
  style: CaptionStyle;
  transform: Transform2D;
  animationType: CaptionAnimationType;
}

export type Clip = VideoClip | AudioClip | TextClip | ImageClip | CaptionClip;

// ─── Track ────────────────────────────────────────────────────
export interface Track {
  id: string;
  type: TrackType;
  name: string;
  order: number;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  clips: Clip[];
}

// ─── Export ───────────────────────────────────────────────────
export interface ExportPreset {
  resolution: string;
  width: number;
  height: number;
  fps: number;
  codec: 'h264' | 'h265' | 'vp9';
  videoBitrate: number; // kbps
  audioBitrate: number; // kbps
  format: 'mp4' | 'webm';
}

// ─── Project Settings ─────────────────────────────────────────
export interface ProjectSettings {
  backgroundColor: string;
  exportPreset: ExportPreset;
  brandKit?: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    logoUrl?: string;
  };
  watermark?: {
    url: string;
    opacity: number;
    position: { x: number; y: number };
  };
}

export interface GlobalAudio {
  masterVolume: number;
}

// ─── Project (Root) ───────────────────────────────────────────
export interface Project {
  storyPlan?: { summary: string; beats: { startTime: number; endTime: number; description: string }[] };
  id: string;
  version: number;
  title: string;
  duration: number;   // total timeline duration (seconds)
  fps: 24 | 30 | 60;
  width: number;      // 1080
  height: number;     // 1920
  tracks: Track[];
  globalAudio: GlobalAudio;
  settings: ProjectSettings;
  updatedAt: string;
}

// ─── Defaults ─────────────────────────────────────────────────
export const DEFAULT_TRANSFORM: Transform2D = {
  x: 0, y: 0,
  width: 100, height: 100,
  rotation: 0, scaleX: 1, scaleY: 1,
  opacity: 1,
  cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
};

export const DEFAULT_COLOR_GRADE: ColorGrade = {
  brightness: 0, contrast: 0, saturation: 0,
  hue: 0, temperature: 0, vignette: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Cairo',
  fontSize: 52,
  fontWeight: '700',
  fontStyle: 'normal',
  color: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.6,
  backgroundPadding: 12,
  backgroundBorderRadius: 8,
  stroke: { color: '#000000', width: 0 },
  shadow: { color: '#000000', offsetX: 2, offsetY: 2, blur: 4 },
  textAlign: 'center',
  lineHeight: 1.4,
  letterSpacing: 0,
  direction: 'rtl',
};

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  ...DEFAULT_TEXT_STYLE,
  preset: 'bold',
  maxWordsPerLine: 5,
  showBackground: true,
  animationIn: 'none',
};

export const DEFAULT_EXPORT_PRESET: ExportPreset = {
  resolution: '1080x1920',
  width: 1080,
  height: 1920,
  fps: 30,
  codec: 'h264',
  videoBitrate: 8000,
  audioBitrate: 192,
  format: 'mp4',
};

export const TIKTOK_PRESET: ExportPreset = {
  ...DEFAULT_EXPORT_PRESET,
  videoBitrate: 8000,
};

export const INSTAGRAM_PRESET: ExportPreset = {
  ...DEFAULT_EXPORT_PRESET,
  videoBitrate: 6000,
  audioBitrate: 128,
};

export const YOUTUBE_SHORTS_PRESET: ExportPreset = {
  ...DEFAULT_EXPORT_PRESET,
  fps: 60,
  videoBitrate: 10000,
};
