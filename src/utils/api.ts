/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionManager } from './SessionManager';

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = SessionManager.getToken();
  const options = { ...init };
  if (token) {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    options.headers = headers;
  }
  return fetch(input, options);
}
