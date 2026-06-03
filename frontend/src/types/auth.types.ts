export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  STUDIO_ADMIN = 'studio_admin',
  STUDIO_STAFF = 'studio_staff',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  INVITED = 'invited',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  studioId: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
}
