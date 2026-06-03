import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User } from '@/types/auth.types';
import { tokenStorage } from '@/utils/storage';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  setAccessToken: (accessToken: string) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,

      setAuth: (user, accessToken) => {
        tokenStorage.setAccessToken(accessToken);
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      setAccessToken: (accessToken) => {
        tokenStorage.setAccessToken(accessToken);
        set({ accessToken, isAuthenticated: true });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setInitialized: (isInitialized) => {
        set({ isInitialized });
      },

      logout: () => {
        tokenStorage.clearAccessToken();
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    { name: 'auth-store' },
  ),
);
