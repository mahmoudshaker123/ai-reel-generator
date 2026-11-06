/**
 * Django API Client
 * Base URL: http://localhost:8000/api
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api';

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

function getStoredUserEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    const item = localStorage.getItem('reelstudio_auth_user');
    if (item) {
      const u = JSON.parse(item);
      return u?.email || '';
    }
  } catch {}
  return '';
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
    skill_id?: string;
  }
): Promise<GenerateReelResponse> => {
  const form = new FormData();
  if (input.video) form.append('video', input.video);
  if (input.prompt) form.append('prompt', input.prompt);
  if (input.title) form.append('title', input.title);
  if (input.media_file_id) form.append('media_file_id', input.media_file_id);
  if (input.caption_mode) form.append('caption_mode', input.caption_mode);
  if (input.reference_image) form.append('reference_image', input.reference_image);
  if (input.skill_id) form.append('skill_id', input.skill_id);
  form.append('visual_director', input.visual_director === false ? 'false' : 'true');

  const userEmail = getStoredUserEmail();
  const headers: Record<string, string> = {
    ...(userEmail ? { 'X-User-Email': userEmail } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/generate-reel/`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
    });
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    if (
      msg.includes('fetch failed') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError')
    ) {
      throw new Error(
        'تعذر الاتصال بالخادم. تأكد من تشغيل سيرفر Django على المنفذ 8002 ثم حاول مرة أخرى.',
      );
    }
    throw new Error('خطأ في الاتصال: ' + msg);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg =
      (json as { error?: string; message?: string }).error ||
      (json as { error?: string; message?: string }).message ||
      `تعذر تجهيز الريل (خطأ ${res.status}): ${res.statusText || 'تأكد من تشغيل الخادم والاتصال بالإنترنت'}`;
    throw new Error(errorMsg);
  }
  return json as GenerateReelResponse;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const userEmail = getStoredUserEmail();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(userEmail ? { 'X-User-Email': userEmail } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
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

  const userEmail = getStoredUserEmail();
  const headers: Record<string, string> = {
    ...(userEmail ? { 'X-User-Email': userEmail } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
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

// ─── Authentication & Google Sign-In ──────────────────────────
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  plan?: string;
  plan_name?: string;
  remaining_credits?: number;
  total_credits?: number;
  used_credits?: number;
  is_unlimited?: boolean;
  is_staff?: boolean;
}

export const apiAuth = {
  me: (): Promise<{ authenticated: boolean; user: UserProfile | null }> =>
    request('/auth/me/'),
  googleLogin: (payload: { credential?: string; email?: string; name?: string; avatar?: string }): Promise<{ status: string; message: string; user: UserProfile }> =>
    request('/auth/google/', { method: 'POST', body: JSON.stringify(payload) }),
  passwordLogin: (payload: { username: string; password: string }): Promise<{ status: string; message: string; user: UserProfile }> =>
    request('/auth/login/', { method: 'POST', body: JSON.stringify(payload) }),
  updateProfile: (payload: { name: string }): Promise<{ status: string; message: string; user: UserProfile }> =>
    request('/auth/profile/', { method: 'POST', body: JSON.stringify(payload) }),
  logout: (): Promise<{ status: string; message: string }> =>
    request('/auth/logout/', { method: 'POST' }),
};

// ─── Subscriptions & Plans ────────────────────────────────────
export interface PricingPlan {
  id: string;
  title: string;
  subtitle: string;
  price_monthly: number;
  price_annual: number;
  billed_annual_total?: number;
  currency: string;
  credits: number | string;
  is_popular: boolean;
  badge: string;
  features: { text: string; included: boolean }[];
}

export interface PaymentMethodInfo {
  name: string;
  number?: string;
  username?: string;
  account_holder?: string;
  phone?: string;
  instructions?: string;
  details?: string;
}

export interface SubscriptionOrderAPI {
  id: string;
  order_number: string;
  user?: { id: number; name: string; email: string };
  plan_id: string;
  plan_title: string;
  amount: number;
  currency: string;
  payment_method: string;
  sender_phone: string;
  transaction_reference?: string;
  receipt_url?: string | null;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  status_display?: string;
  admin_notes?: string;
  created_at: string;
  approved_at?: string | null;
}

export interface MyQuotaResponse {
  status: string;
  plan: string;
  plan_name: string;
  remaining_credits: number;
  total_credits: number;
  used_credits: number;
  is_unlimited: boolean;
  orders: SubscriptionOrderAPI[];
}

export const apiSubscription = {
  getPlans: (): Promise<{ status: string; plans: PricingPlan[]; payment_info: Record<string, PaymentMethodInfo> }> =>
    request('/subscriptions/plans/'),

  getMyQuota: (): Promise<MyQuotaResponse> =>
    request('/subscriptions/my-quota/'),

  checkout: async (
    payload: FormData | {
      plan_id: string;
      plan_title: string;
      amount: number;
      payment_method?: string;
      sender_phone: string;
      transaction_reference?: string;
      receipt?: File;
      notes?: string;
    }
  ): Promise<{ status: string; message: string; order_id: string; order_number: string }> => {
    let form: FormData;
    if (payload instanceof FormData) {
      form = payload;
    } else {
      form = new FormData();
      form.append('plan_id', payload.plan_id);
      form.append('plan_title', payload.plan_title);
      form.append('amount', String(payload.amount));
      if (payload.payment_method) form.append('payment_method', payload.payment_method);
      if (payload.sender_phone) form.append('sender_phone', payload.sender_phone);
      if (payload.transaction_reference) form.append('transaction_reference', payload.transaction_reference);
      if (payload.receipt) form.append('receipt', payload.receipt);
      if (payload.notes) form.append('notes', payload.notes);
    }
    const userEmail = getStoredUserEmail();
    const headers: Record<string, string> = {
      ...(userEmail ? { 'X-User-Email': userEmail } : {}),
    };
    const res = await fetch(`${BASE_URL}/subscriptions/checkout/`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((json as { message?: string; error?: string }).message || (json as { error?: string }).error || 'فشل إرسال طلب الاشتراك');
    }
    return json;
  },

  adminListOrders: (status?: string): Promise<{ status: string; total: number; orders: SubscriptionOrderAPI[] }> =>
    request(`/subscriptions/admin/orders/${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  adminOrderAction: (orderId: string, action: 'approve' | 'reject', reason?: string): Promise<{ status: string; message: string; user_remaining_credits?: number }> =>
    request(`/subscriptions/admin/orders/${encodeURIComponent(orderId)}/action/`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),
};

// ─── Admin Users & System Management ──────────────────────────
export interface AdminUserItem {
  id: number;
  username: string;
  email: string;
  name: string;
  plan: string;
  plan_name: string;
  remaining_credits: number;
  total_credits: number;
  used_credits: number;
  is_unlimited: boolean;
  is_staff: boolean;
  date_joined: string;
}

export const apiAdmin = {
  listUsers: (): Promise<{ status: string; users: AdminUserItem[] }> =>
    request('/admin/users/'),
  updateUser: (
    userId: number,
    payload: { plan?: string; add_credits?: number; is_unlimited?: boolean }
  ): Promise<{ status: string; message: string; user: Partial<AdminUserItem> }> =>
    request(`/admin/users/${userId}/update/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
