import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginCredentials,
  ResetPasswordPayload,
} from '@/types/auth.types';

export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

export const useProfileQuery = (enabled = true) => {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => authService.getProfile(),
    enabled,
    retry: false,
  });
};

export const useLoginMutation = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      queryClient.setQueryData(authKeys.profile(), user);
    },
  });
};

export const useLogoutMutation = () => {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
};

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => authService.forgotPassword(payload),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authService.resetPassword(payload),
  });
};

export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  });
};
