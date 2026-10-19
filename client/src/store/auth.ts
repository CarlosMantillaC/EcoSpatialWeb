import { create } from 'zustand';
import type { AuthResponse, AuthUser } from '../types';
import { authApi, setAuthToken } from '../lib/api';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  setSession: (auth: AuthResponse) => void;
  logout: () => void;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('ecospatial_token'),
  status: 'idle',
  setSession: (auth) => {
    setAuthToken(auth.token);
    set({ user: auth.user, token: auth.token, status: 'authenticated' });
  },
  logout: () => {
    setAuthToken(null);
    set({ user: null, token: null, status: 'anonymous' });
  },
  restore: async () => {
    if (!localStorage.getItem('ecospatial_token')) {
      set({ status: 'anonymous' });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await authApi.me();
      set({ user, status: 'authenticated' });
    } catch {
      setAuthToken(null);
      set({ user: null, token: null, status: 'anonymous' });
    }
  },
}));
