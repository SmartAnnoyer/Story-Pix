const ACCESS_TOKEN_KEY = 'storypix_access_token';

export const tokenStorage = {
  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  clearAccessToken(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};
