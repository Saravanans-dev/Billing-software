import { create } from 'zustand';
import api from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  verifyAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  verifyAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/verify');
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null });
    }
  },
}));
