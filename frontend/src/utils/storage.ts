const ACCESS_TOKEN_KEY = 'storypix_access_token';

/** Persist across browser restarts so studio clients stay signed in. */
const readAccessToken = (): string | null => {
  try {
    const fromLocal = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (fromLocal) return fromLocal;

    // Migrate older sessionStorage tokens once, then clear them.
    const fromSession = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (fromSession) {
      localStorage.setItem(ACCESS_TOKEN_KEY, fromSession);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      return fromSession;
    }
  } catch {
    // Private mode / blocked storage
  }
  return null;
};

export const tokenStorage = {
  getAccessToken(): string | null {
    return readAccessToken();
  },

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Private mode / blocked storage
    }
  },

  clearAccessToken(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Private mode / blocked storage
    }
  },
};
