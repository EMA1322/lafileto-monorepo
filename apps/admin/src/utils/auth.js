// auth.js
// Comentarios en español; código en inglés.
// Fuente única de verdad: API_BASE, token, apiFetch, login/logout, isAuthenticated.

import { setServerSession } from './rbac.js';

function normalizeBase(raw) {
  const value = String(raw || '').trim();
  if (!value) return '/api/v1';

  const sanitized = value.replace(/\/+$/, '');

  if (/^https?:\/\//i.test(sanitized)) {
    if (/\/api\/v\d+$/i.test(sanitized)) return sanitized;
    if (/\/api$/i.test(sanitized)) return `${sanitized}/v1`;
    return `${sanitized}/api/v1`;
  }

  if (/^\/?api$/i.test(sanitized)) return '/api/v1';
  if (/^\/?api\/v\d+$/i.test(sanitized)) {
    return sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
  }

  if (sanitized.startsWith('/')) return `${sanitized}/api/v1`.replace(/\/{2,}/g, '/');
  return `/${sanitized}/api/v1`.replace(/\/{2,}/g, '/');
}

export const API_BASE = (() => {
  const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('API_BASE') : '';
  const fromEnv = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE : '';
  const resolved = normalizeBase(fromStorage || fromEnv || '');
  // DEBUG: surface API base used to diagnose proxy issues (TODO remove)
  console.debug('[auth] API_BASE resolved', { base: resolved, fromStorage: !!fromStorage, fromEnv: !!fromEnv });
  return resolved;
})();

const TOKEN_KEY = 'auth_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(token) { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
export function isAuthenticated() { return !!getToken(); }

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return base + p;
}

/**
 * apiFetch:
 * - Adjunta JWT si existe
 * - Envelope JSON ({ ok, data, meta } / { ok:false, error })
 * - Limpia token en 401/AUTH_* (el router hará el resto)
 * - (R-6) No agrega 'Content-Type' si es GET o si no hay body
 */
export async function apiFetch(path, options = {}) {
  const { params, ...restOptions } = options;
  let url = joinUrl(API_BASE, path);

  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      const values = Array.isArray(value) ? value : [value];
      for (const entry of values) {
        searchParams.append(key, `${entry}`);
      }
    }

    const query = searchParams.toString();
    if (query) {
      // Mantener compatibilidad con rutas que ya incluyen query.
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }

  // Normalizar método y headers
  const method = ((restOptions.method || 'GET') + '').toUpperCase();
  const headers = new Headers(restOptions.headers || {});

  // Sólo para requests con body y no-GET seteamos Content-Type
  const hasBody = restOptions.body != null && method !== 'GET';
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Adjuntar token si existe
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const startedAt =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  // DEBUG: instrumentation to diagnose hanging login (TODO remove)
  console.debug('[apiFetch] request', {
    method,
    url,
    hasBody,
    params: params ? Object.keys(params) : [],
    hasAuth: !!token
  });

  let res;
  try {
    res = await fetch(url, { ...restOptions, method, headers });
  } catch (networkError) {
    // DEBUG: instrumentation to diagnose hanging login (TODO remove)
    console.error('[apiFetch] network error', { url, message: networkError?.message });
    throw networkError;
  }

  // Leer texto y tratar de parsear JSON (útil cuando el server responde texto)
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* no-op */ }

  const endedAt =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  const responseDebug = {
    method,
    url,
    status: res.status,
    durationMs: Math.round(endedAt - startedAt)
  };

  // Normalización de errores (envelope)
  if (!res.ok || json?.ok === false) {
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.code = json?.error?.code;
    err.details = json?.error?.details;

    // 401 → limpiar token
    if (res.status === 401 || err.code === 'AUTH_REQUIRED' || err.code === 'AUTH_INVALID') {
      clearToken();
    }

    console.warn('[apiFetch] error response', responseDebug);
    console.error('API error', { url, status: res.status, body: text });
    throw err;
  }

  // DEBUG: instrumentation to diagnose hanging login (TODO remove)
  console.debug('[apiFetch] response', responseDebug);

  // Devuelve envelope { ok, data, meta }
  return json;
}

// Login/logout (sin cambios de comportamiento)
export async function login(email, password) {
  const { data } = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  setToken(data.token);

  // Opcional: almacenar usuario/permisos para RBAC UI
  try {
    if (typeof setServerSession === 'function' && data?.user) {
      await setServerSession(data.user.roleId, data.user.effectivePermissions);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
  } catch { /* no-op */ }

  return data;
}

export function logout() {
  clearToken();
  localStorage.removeItem('user');
}



