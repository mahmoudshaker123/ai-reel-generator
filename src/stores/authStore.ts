import { create } from 'zustand';
import { apiAuth, type UserProfile } from '@/lib/api';

export interface CreatorPreferences {
  captionMode: 'sentence' | 'word_by_word';
  visualDirector: boolean;
  aspectRatio: '9:16' | '16:9' | '1:1';
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAuthModalOpen: boolean;
  isSettingsModalOpen: boolean;
  preferences: CreatorPreferences;
  login: (user: UserProfile) => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  updatePreferences: (prefs: Partial<CreatorPreferences>) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

const STORAGE_KEY = 'reelstudio_auth_user';
const PREFS_KEY = 'reelstudio_creator_preferences';

const DEFAULT_PREFS: CreatorPreferences = {
  captionMode: 'sentence',
  visualDirector: true,
  aspectRatio: '9:16',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: typeof window !== 'undefined'
    ? (() => {
        try {
          const item = localStorage.getItem(STORAGE_KEY);
          return item ? JSON.parse(item) : null;
        } catch {
          return null;
        }
      })()
    : null,
  isAuthenticated: typeof window !== 'undefined'
    ? !!localStorage.getItem(STORAGE_KEY)
    : false,
  loading: true,
  isAuthModalOpen: false,
  isSettingsModalOpen: false,

  preferences: typeof window !== 'undefined'
    ? (() => {
        try {
          const item = localStorage.getItem(PREFS_KEY);
          return item ? { ...DEFAULT_PREFS, ...JSON.parse(item) } : DEFAULT_PREFS;
        } catch {
          return DEFAULT_PREFS;
        }
      })()
    : DEFAULT_PREFS,

  login: (user: UserProfile) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {}
    set({ user, isAuthenticated: true, isAuthModalOpen: false });
  },

  updateUser: (partial: Partial<UserProfile>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ user: updated });
  },

  updatePreferences: (prefs: Partial<CreatorPreferences>) => {
    const updated = { ...get().preferences, ...prefs };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    } catch {}
    set({ preferences: updated });
  },

  logout: async () => {
    try {
      await apiAuth.logout();
    } catch {}
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    set({ user: null, isAuthenticated: false, isSettingsModalOpen: false });
  },

  checkAuth: async () => {
    try {
      const res = await apiAuth.me();
      if (res.authenticated && res.user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
        set({ user: res.user, isAuthenticated: true, loading: false });
      } else {
        localStorage.removeItem(STORAGE_KEY);
        set({ user: null, isAuthenticated: false, loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
}));
