import { useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/utils/storage';

export const useAuthBootstrap = () => {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const logout = useAuthStore((state) => state.logout);
  const setInitialized = useAuthStore((state) => state.setInitialized);

  useEffect(() => {
    const bootstrap = async () => {
      const existingToken = tokenStorage.getAccessToken();

      if (!existingToken) {
        setInitialized(true);
        return;
      }

      try {
        const user = await authService.getProfile();
        setAuth(user, existingToken);
      } catch {
        try {
          const { accessToken } = await authService.refresh();
          setAccessToken(accessToken);
          const user = await authService.getProfile();
          setUser(user);
        } catch {
          logout();
        }
      } finally {
        setInitialized(true);
      }
    };

    bootstrap();
  }, [setAuth, setUser, setAccessToken, logout, setInitialized]);

  return { isInitialized };
};

export const useAuth = () => useAuthStore();
