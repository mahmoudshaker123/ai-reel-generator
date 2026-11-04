/**
 * Django API Client
 * Base URL: http://localhost:8000/api
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ─── Types (matching backend serializers) ───────────────────────────────────

export interface ProjectMeta {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  aspect_ratio: '9:16' | '16:9' | '1:1' | '4:5';
  duration: number;
  fps: number;
  width: number;
  height: number;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectMeta {
  timeline_json: Record<string, unknown>;
  media_files: MediaFileAPI[];
}

export interface MediaFileAPI {
  id: string;
  project: string | null;
  media_type: 'video' | 'audio' | 'image';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  original_name: string;
  url: string;
  thumbnail_url: string;
  size: number;
  mime_type: string;
  duration?: number;
  video_width?: number;
  video_height?: number;
  fps?: number;
  codec?: string;
  sample_rate?: number;
  channels?: number;
  created_at: string;
  updated_at: string;
}

export interface RenderJobAPI {
  id: string;
  project: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  output_url: string;
  error_message: string;
  resolution: string;
  format: string;
  fps: number;
  created_at: string;
  completed_at?: string;
}

export interface AIJobAPI {
  id: string;
  project: string;
  media_file: string;
  status: 'pending' | 'transcribing' | 'analyzing' | 'editing' | 'completed' | 'failed';
  job_type: string;
  progress: number;
  target_duration: number;
  language: string;
  style: string;
  options: Record<string, boolean>;
  transcript_json?: unknown[];
  editing_plan_json?: unknown;
  result_timeline?: Record<string, unknown>;
  error_message: string;
  created_at: string;
  completed_at?: string;
}

export interface GenerateReelResponse {
  status: string;
  message: string;
  project_id: string;
  editor_url: string;
  duration: number;
  actions_taken: string[];
  prompt_analysis: {
    remove_silence: boolean;
    add_captions: boolean;
    add_shapes: boolean;
    style: string;
    color_mood: string;
  };
  timeline: Record<string, unknown>;
}

// ─── Unified One-Shot AI Reel Generator ──────────────────────────────────────
export const apiGenerateReel = async (
  input: {
    video?: File;
    prompt: string;
    title?: string;
    media_file_id?: string;
    caption_mode?: 'sentence' | 'word_by_word';
    reference_image?: File;
    visual_director?: boolean;
  }
): Promise<GenerateReelResponse> => {
  const form = new FormData();
  if (input.video) form.append('video', input.video);
  if (input.prompt) form.append('prompt', input.prompt);
  if (input.title) form.append('title', input.title);
  if (input.media_file_id) form.append('media_file_id', input.media_file_id);
  if (input.caption_mode) form.append('caption_mode', input.caption_mode);
  if (input.reference_image) form.append('reference_image', input.reference_image);
  form.append('visual_director', input.visual_director === false ? 'false' : 'true');

  const res = await fetch(`${BASE_URL}/generate-reel/`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string }).error || `Generation failed: HTTP ${res.status}`
    );
  }
  return json as GenerateReelResponse;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      (json as { error?: string; message?: string }).error || (json as { message?: string }).message ||
        `HTTP ${res.status}: ${res.statusText}`,
    );
  }

  return (json as { data: T }).data ?? (json as T);
}

async function upload<T>(path: string, file: File, extraFields?: Record<string, string>): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  if (extraFields) {
    Object.entries(extraFields).forEach(([k, v]) => form.append(k, v));
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      (json as { error?: string }).error || `Upload failed: HTTP ${res.status}`,
    );
  }

  return (json as { data: T }).data ?? (json as T);
}

// ─── API Clients ────────────────────────────────────────────────────────────

// ── Health ──────────────────────────────────────────────────────────────────
export const apiHealth = () =>
  fetch(`${BASE_URL}/health/`).then(r => r.json());

// ── Projects ────────────────────────────────────────────────────────────────
export const apiProjects = {
  list: (): Promise<ProjectMeta[]> =>
    request<ProjectMeta[]>('/projects/'),

  create: (data: { title: string; aspect_ratio?: string }): Promise<ProjectDetail> =>
    request<ProjectDetail>('/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: string): Promise<ProjectDetail> =>
    request<ProjectDetail>(`/projects/${id}/`),

  update: (id: string, data: Partial<ProjectDetail>): Promise<ProjectDetail> =>
    request<ProjectDetail>(`/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    request<void>(`/projects/${id}/`, { method: 'DELETE' }),

  saveTimeline: (id: string, timeline: Record<string, unknown>): Promise<{ message: string; updated_at: string }> =>
    request<{ message: string; updated_at: string }>(`/projects/${id}/timeline/`, {
      method: 'POST',
      body: JSON.stringify({ timeline }),
    }),
};

// ── Media ────────────────────────────────────────────────────────────────────
export const apiMedia = {
  list: (projectId: string): Promise<MediaFileAPI[]> =>
    request<MediaFileAPI[]>(`/projects/${projectId}/media/`),

  upload: (projectId: string, file: File): Promise<MediaFileAPI> =>
    upload<MediaFileAPI>(`/projects/${projectId}/media/upload/`, file),

  delete: (projectId: string, mediaId: string): Promise<void> =>
    request<void>(`/projects/${projectId}/media/${mediaId}/`, { method: 'DELETE' }),

  /** Upload without project (global) */
  uploadGlobal: (file: File): Promise<MediaFileAPI> =>
    upload<MediaFileAPI>('/media/upload/', file),
};

// ── Render Jobs ──────────────────────────────────────────────────────────────
export const apiRender = {
  list: (projectId: string): Promise<RenderJobAPI[]> =>
    request<RenderJobAPI[]>(`/projects/${projectId}/render/`),

  start: (projectId: string, opts: {
    resolution?: string;
    format?: string;
    fps?: number;
    timeline?: Record<string, unknown>;
  }): Promise<RenderJobAPI> =>
    request<RenderJobAPI>(`/projects/${projectId}/render/`, {
      method: 'POST',
      body: JSON.stringify(opts),
    }),

  status: (projectId: string, jobId: string): Promise<RenderJobAPI> =>
    request<RenderJobAPI>(`/projects/${projectId}/render/${jobId}/`),

  /** Poll until completed or failed */
  pollUntilDone: async (
    projectId: string,
    jobId: string,
    onProgress: (job: RenderJobAPI) => void,
    intervalMs = 1500,
  ): Promise<RenderJobAPI> => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await apiRender.status(projectId, jobId);
          onProgress(job);
          if (job.status === 'completed') return resolve(job);
          if (job.status === 'failed' || job.status === 'cancelled') {
            return reject(new Error(job.error_message || 'Render failed'));
          }
          setTimeout(poll, intervalMs);
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  },
};

// ── AI Jobs ──────────────────────────────────────────────────────────────────
export const apiAI = {
  list: (projectId: string): Promise<AIJobAPI[]> =>
    request<AIJobAPI[]>(`/projects/${projectId}/ai/`),

  start: (projectId: string, opts: {
    media_file_id: string;
    job_type?: string;
    target_duration?: number;
    language?: string;
    style?: string;
    options?: Record<string, boolean>;
  }): Promise<AIJobAPI> =>
    request<AIJobAPI>(`/projects/${projectId}/ai/`, {
      method: 'POST',
      body: JSON.stringify(opts),
    }),

  status: (projectId: string, jobId: string): Promise<AIJobAPI> =>
    request<AIJobAPI>(`/projects/${projectId}/ai/${jobId}/`),

  /** Poll until completed or failed */
  pollUntilDone: async (
    projectId: string,
    jobId: string,
    onProgress: (job: AIJobAPI) => void,
    intervalMs = 1500,
  ): Promise<AIJobAPI> => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await apiAI.status(projectId, jobId);
          onProgress(job);
          if (job.status === 'completed') return resolve(job);
          if (job.status === 'failed') {
            return reject(new Error(job.error_message || 'AI job failed'));
          }
          setTimeout(poll, intervalMs);
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  },
};

export const apiDirector = {
  edit: (projectId: string, prompt: string): Promise<{ changed: boolean; message: string; timeline: Record<string, unknown> }> =>
    request('/projects/' + encodeURIComponent(projectId) + '/director/', { method: 'POST', body: JSON.stringify({ prompt }) }),
};

// ─── Gemini Settings ──────────────────────────────────────────
export const apiGemini = {
  getStatus: (): Promise<{ configured: boolean; masked_key: string; model: string }> =>
    request('/settings/gemini-key/'),
  saveKey: (apiKey: string): Promise<{ status: string; message: string; model?: string }> =>
    request('/settings/gemini-key/', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),
};
