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
  
  try {
    const response = await fetch(input, options);
    
    // Intercept database/server errors
    if (!response.ok) {
      // Clone response to avoid disturbing the original consumer's body stream
      const clone = response.clone();
      clone.json().then(data => {
        const errorMsg = data?.error || data?.message || `System Error ${response.status}`;
        window.dispatchEvent(new CustomEvent('system-api-error', { 
          detail: { 
            message: errorMsg,
            status: response.status
          } 
        }));
      }).catch(() => {
        clone.text().then(text => {
          window.dispatchEvent(new CustomEvent('system-api-error', { 
            detail: { 
              message: text || `System Error ${response.status}`,
              status: response.status
            } 
          }));
        }).catch(() => {});
      });
    } else {
      // If the response is OK, let's also check if it returns a JSON with { success: false, error: ... }
      const clone = response.clone();
      clone.json().then(data => {
        if (data && data.success === false && data.error) {
          window.dispatchEvent(new CustomEvent('system-api-error', { 
            detail: { 
              message: data.error,
              status: 200
            } 
          }));
        }
      }).catch(() => {});
    }
    
    return response;
  } catch (err: any) {
    window.dispatchEvent(new CustomEvent('system-api-error', { 
      detail: { 
        message: 'Unable to connect to the server. Please check your network connection.',
        status: 0
      } 
    }));
    throw err;
  }
}
