export interface ApiResponse<T = unknown> {
  data: T;
  meta: {
    requestId?: string;
    timestamp: string;
  };
  error: null;
}

export interface ApiErrorResponse {
  data: null;
  meta: {
    requestId?: string;
    timestamp: string;
  };
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  studioId?: string;
}

export interface AuthenticatedUser extends JwtPayload {
  userId: string;
}
