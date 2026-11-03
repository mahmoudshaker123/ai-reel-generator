// ============================================================
// Media & API Types
// ============================================================

export type MediaType = 'video' | 'audio' | 'image' | 'font';
export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface MediaFile {
  id: string;
  userId: string;
  projectId?: string;
  type: MediaType;
  status: MediaStatus;
  originalName: string;
  storageKey: string;
  url: string;
  thumbnailUrl?: string;
  // Video
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  // Audio
  sampleRate?: number;
  channels?: number;
  // File
  size: number;
  mimeType: string;
  createdAt: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface RenderJob {
  id: string;
  projectId: string;
  userId: string;
  status: JobStatus;
  progress: number;
  outputUrl?: string;
  errorMessage?: string;
  resolution: string;
  format: 'mp4' | 'webm';
  fps: number;
  createdAt: string;
  completedAt?: string;
}

export type AIJobType = 'full_edit' | 'transcription_only' | 'highlight_detection' | 'caption_gen';
export type AIJobStatus = 'pending' | 'transcribing' | 'analyzing' | 'editing' | 'completed' | 'failed';
export type ReelStyle = 'viral' | 'educational' | 'professional' | 'podcast' | 'business';

export interface AIJobOptions {
  removeSilence: boolean;
  autoHook: boolean;
  autoZoom: boolean;
  addMusic: boolean;
  addCaptions: boolean;
}

export interface AIJob {
  id: string;
  projectId: string;
  mediaFileId: string;
  status: AIJobStatus;
  type: AIJobType;
  progress: number;
  targetDuration: number;
  language: string;
  style: ReelStyle;
  options: AIJobOptions;
  transcriptJson?: TranscriptWord[];
  editingPlanJson?: EditingPlan;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  words: TranscriptWord[];
}

export interface HighlightSegment {
  sourceStart: number;
  sourceEnd: number;
  priority: 'hook' | 'body' | 'cta' | 'highlight';
  score: number;
  reason: string;
}

export interface EditingPlan {
  targetDuration: number;
  segments: HighlightSegment[];
  suggestedMusic?: string;
  hookText?: string;
  captionStyle?: string;
  notes?: string;
}

// ─── Project Meta (DB model) ──────────────────────────────────
export type ProjectStatus = 'draft' | 'rendering' | 'completed' | 'failed';
export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';

export interface ProjectMeta {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  aspectRatio: AspectRatio;
  duration: number;
  fps: number;
  width: number;
  height: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Types ───────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  mediaId: string;
}

// ─── WebSocket Messages ───────────────────────────────────────
export type WsMessageType = 'progress' | 'completed' | 'failed' | 'ping';

export interface WsJobMessage {
  type: WsMessageType;
  jobId: string;
  jobType: 'render' | 'ai';
  status: JobStatus | AIJobStatus;
  progress: number;
  step?: string;
  result?: Record<string, unknown>;
  error?: string;
}
