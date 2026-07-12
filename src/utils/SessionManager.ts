/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SessionManager = {
  TOKEN_KEY: 'apex_session_token',

  /**
   * Store the active user session token in localStorage
   */
  setToken(token: string): void {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  },

  /**
   * Retrieve the active user session token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * Remove the active user session token from localStorage
   */
  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  /**
   * Check if a session token exists in localStorage
   */
  hasToken(): boolean {
    return !!this.getToken();
  },

  /**
   * Validate the token with the server to check if it is still valid
   */
  async validateToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return !!(data && data.success && data.user);
      }
    } catch (err) {
      console.error('SessionManager token validation failed:', err);
    }
    return false;
  }
};
