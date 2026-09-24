// Thin client for the FullBackendd CleanBridge API (/api/v1/cleanbridge/*).
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:7004').replace(/\/$/, '');
const BASE = `${API_URL}/api/v1/cleanbridge`;
const TOKEN_KEY = 'cleanbridge-token';

export const tokenStore = {
  get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token) { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* private mode */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } }
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// The backend's duplicate-key message is technical; say it like a person.
const friendly = (message = '') => {
  const dup = message.match(/value entered for (\w+) field already exists/);
  if (dup) {
    const field = { email: 'email address', phone: 'phone number', registration: 'registration number' }[dup[1]] || dup[1];
    return `An account or record with this ${field} already exists.`;
  }
  return message;
};

export async function request(method, path, body) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('Cannot reach CleanBridge right now. Check your internet connection and try again.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(friendly(data.msg || data.message || data.error) || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path)
};

// Absolute URL of a page in this app (respects Vite's BASE_URL).
export const appUrl = (path) => `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const googleSignInUrl = (role = 'customer') =>
  `${API_URL}/api/v1/auth/google?app=cleanbridge&role=${role}&redirect_uri=${encodeURIComponent(appUrl('auth/callback'))}`;
