// auth.js
// Comentarios en español; código en inglés.
// Fuente única de verdad: API_BASE, token, apiFetch, login/logout, isAuthenticated.

import { setServerSession } from './rbac.js';

// Normaliza la base del API para que funcione con proxy de Vite (/api) o URL absoluta.
export const API_BASE = (() => {
  const ls = (typeof localStorage !== 'undefined' && localStorage.getItem('API_BASE')) || '';
  const env = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || '';

  // preferencia: localStorage > .env > '/api'
  const raw = String(ls || env || '/api').trim();
  const s = raw.replace(/\/+$/, ''); // sin barra final

  // URL absoluta
  if (/^https?:\/\//i.test(s)) {
    if (/\/api\/v\d+$/i.test(s)) return s; // …/api/v1
    if (/\/api$/i.test(s)) return `${s}/v1`; // …/api -> …/api/v1
    return `${s}/api/v1`; // … -> …/api/v1
  }

  // Ruta relativa (para proxy de Vite)
  if (/^\/api\/v\d+$/i.test(s)) return s; // /api/v1
  if (s === '/api' || s === '') return '/api/v1';
  return `${s}/api/v1`;
})();

const TOKEN_KEY = 'auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(token) {
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isAuthenticated() {
  return !!getToken();
}

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

  // Ejecutar request
  const res = await fetch(url, { ...restOptions, method, headers });

  // Leer texto y tratar de parsear JSON (útil cuando el server responde texto)
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* no-op */
  }

  // Normalización de errores (envelope)
  if (!res.ok || json?.ok === false) {
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.code = json?.error?.code;
    err.details = json?.error?.details;

    // 401 → limpiar token
    if (res.status === 401 || err.code === 'AUTH_REQUIRED' || err.code === 'AUTH_INVALID') {
      clearToken();
    }

    console.error('API error', { url, status: res.status, body: text });
    throw err;
  }

  // Devuelve envelope { ok, data, meta }
  return json;
}

// Login/logout (sin cambios de comportamiento)
export async function login(email, password) {
  const { data } = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setToken(data.token);

  // Opcional: almacenar usuario/permisos para RBAC UI
  try {
    if (typeof setServerSession === 'function' && data?.user) {
      await setServerSession(data.user.roleId, data.user.effectivePermissions);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
  } catch {
    /* no-op */
  }

  return data;
}

export function logout() {
  clearToken();
  localStorage.removeItem('user');
}
