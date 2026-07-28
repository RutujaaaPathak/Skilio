const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

let accessToken = null;
let isRefreshing = false;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

async function attemptRefresh() {
  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        accessToken = data.token;
        return data.token;
      }
      return null;
    }
    clearAccessToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('Session expired. Please login again.');
  })();

  try {
    const result = await refreshPromise;
    return result;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

async function request(endpoint, options = {}) {
  const headers = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !endpoint.startsWith('/auth/')) {
    try {
      const newToken = await attemptRefresh();
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch {
      const err = new Error('Session expired. Please login again.');
      err.status = 401;
      throw err;
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let message = body.message || `Request failed (${res.status})`;
    if (Array.isArray(body.detail)) {
      message = body.detail.map((d) => d.msg).join('; ');
    } else if (typeof body.detail === 'string') {
      message = body.detail;
    }
    if (res.status >= 500) {
      console.error(`[API Error] ${res.status} ${endpoint}:`, body);
      message = 'A server error occurred. Please try again later.';
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export { attemptRefresh };

export const api = {
  get: (url, opts) => request(url, { method: 'GET', ...opts }),
  post: (url, body, opts) => request(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  put: (url, body, opts) => request(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  patch: (url, body, opts) => request(url, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  delete: (url, opts) => request(url, { method: 'DELETE', ...opts }),
};