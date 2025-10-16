// auth.js
// Comentarios en español; código en inglés.
// Fuente única de verdad: API_BASE, token, apiFetch, login/logout, isAuthenticated.

import { setServerSession, clearRbac } from './rbac.js';
import { showSnackbar } from './snackbar.js';

const IS_DEV = (() => {
  try {
    return Boolean(import.meta?.env?.DEV);
  } catch {
    return typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false;
  }
})();

const KNOWN_ERROR_STATUS = new Set([401, 403, 408, 422, 429, 500, 504]);

// Mensajes globales por código/status para surfaced legibles.
const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Tu sesión expiró. Iniciá sesión nuevamente.',
  AUTH_INVALID: 'Credenciales inválidas o token vencido.',
  PERMISSION_DENIED: 'No tenés permisos para realizar esta acción.',
  VALIDATION_ERROR: 'Revisá los datos e intentá nuevamente.',
  RATE_LIMITED: 'Demasiados intentos. Probá en unos minutos.',
  TOO_MANY_REQUESTS: 'Demasiadas solicitudes. Esperá un momento y reintentá.',
  REQUEST_TIMEOUT: 'La petición tardó demasiado. Verificá tu conexión.',
  INTERNAL_ERROR: 'Ocurrió un error interno. Intentá más tarde.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Revisá tu red.'
};

const STATUS_TO_DEFAULT_CODE = {
  401: 'AUTH_REQUIRED',
  403: 'PERMISSION_DENIED',
  408: 'REQUEST_TIMEOUT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  504: 'REQUEST_TIMEOUT'
};

let isLoggingOut = false;

const authState = {
  user: null,
  roleId: null,
  permissions: {},
  hydrated: false,
  hydratePromise: null
};

const HOME_ROUTE_FALLBACK = ['products', 'categories', 'users', 'settings', 'admin-header'];

function resetAuthCache() {
  authState.user = null;
  authState.roleId = null;
  authState.permissions = {};
  authState.hydrated = false;
  authState.hydratePromise = null;
}

function normalizePermissionMap(source) {
  if (!source || typeof source !== 'object') return {};
  const entries = Array.isArray(source)
    ? source.map((entry) => [entry?.moduleKey, entry])
    : Object.entries(source);
  const map = {};
  for (const [rawKey, value] of entries) {
    if (!rawKey) continue;
    const key = String(rawKey).trim().toLowerCase();
    if (!key) continue;
    const perms = value && typeof value === 'object' ? value : {};
    map[key] = {
      r: !!perms.r,
      w: !!perms.w,
      u: !!perms.u,
      d: !!perms.d
    };
  }
  return map;
}

export function getPermissions() {
  return { ...authState.permissions };
}

export function getCurrentUser() {
  return authState.user;
}

async function performLogoutRequest() {
  const token = getToken();
  if (!token) return;
  const url = joinUrl(API_BASE, '/auth/logout');
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    if (IS_DEV) {
      console.warn('[auth] logout request failed', err);
    }
  }
}

async function clearAuthState({ redirect = true } = {}) {
  resetAuthCache();
  try {
    await setServerSession?.(null, null);
  } catch { /* ignore */ }
  try {
    clearRbac?.();
  } catch { /* ignore */ }
  try {
    localStorage.removeItem('user');
  } catch { /* ignore */ }
  try {
    sessionStorage.removeItem('auth.roleId');
  } catch { /* ignore */ }
  try {
    sessionStorage.removeItem('effectivePermissions');
  } catch { /* ignore */ }
  clearToken();

  if (redirect && typeof window !== 'undefined') {
    const nextHash = '#login';
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }
}

function normalizeMessage(value) {
  if (value == null) return '';
  return String(value).trim();
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.prototype.toString.call(value) === '[object Object]';
}

function resolveErrorMessage(status, code, fallback, override) {
  const overrideMsg = normalizeMessage(override);
  if (overrideMsg) return overrideMsg;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  const statusCode = STATUS_TO_DEFAULT_CODE[status];
  if (statusCode && ERROR_MESSAGES[statusCode]) return ERROR_MESSAGES[statusCode];
  const fallbackMsg = normalizeMessage(fallback);
  if (fallbackMsg) return fallbackMsg;
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

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
  if (IS_DEV) {
    // Log de diagnóstico para confirmar que Vite proxy apunta al backend correcto.
    console.debug('[auth] API_BASE resolved', { base: resolved, fromStorage: !!fromStorage, fromEnv: !!fromEnv });
  }
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
 * - Adjunta JWT si existe y respeta envelope `{ ok, data, meta }`.
 * - `showErrorToast=false` permite que el caller maneje el error (ej: login).
 * - Limpia el token ante 401/403 expirados y muestra mensajes legibles.
 */
export async function apiFetch(path, options = {}) {
  const {
    params,
    showErrorToast = true,
    errorMessage,
    body,
    ...restOptions
  } = options;

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

  const method = String(restOptions.method || 'GET').toUpperCase();
  const headers = new Headers(restOptions.headers || {});

  // Sólo para requests con body y no-GET seteamos Content-Type.
  const hasBody = body != null && method !== 'GET';
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Adjuntar token si existe.
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let preparedBody = body;
  if (
    hasBody &&
    isPlainObject(preparedBody) &&
    String(headers.get('Content-Type') || '').startsWith('application/json')
  ) {
    try {
      preparedBody = JSON.stringify(preparedBody);
    } catch {
      preparedBody = JSON.stringify({ ...preparedBody });
    }
  }

  const startedAt =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  if (IS_DEV) {
    console.debug('[apiFetch] request', {
      method,
      url,
      hasBody,
      params: params ? Object.keys(params) : [],
      hasAuth: !!token
    });
  }

  let res;
  try {
    const fetchOptions = hasBody
      ? { ...restOptions, method, headers, body: preparedBody }
      : { ...restOptions, method, headers };
    res = await fetch(url, fetchOptions);
  } catch (networkError) {
    const err = networkError instanceof Error
      ? networkError
      : new Error(String(networkError || 'Network error'));
    err.code = err.code || 'NETWORK_ERROR';

    if (showErrorToast) {
      const toastMessage = resolveErrorMessage(undefined, err.code, err.message, errorMessage);
      showSnackbar(toastMessage, { type: 'error', code: err.code });
    }

    if (IS_DEV) {
      console.error('[apiFetch] network error', { url, message: err.message });
    }

    throw err;
  }

  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }
  }

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

  if (!res.ok || json?.ok === false) {
    const payloadError = json?.error || {};
    const codeFromPayload = payloadError?.code ? String(payloadError.code).trim() : '';
    const statusCode = STATUS_TO_DEFAULT_CODE[res.status];
    const derivedCode = codeFromPayload || statusCode || 'INTERNAL_ERROR';
    const errMessage = payloadError?.message || `HTTP ${res.status}`;

    const err = new Error(errMessage);
    err.code = derivedCode;
    err.status = res.status;
    err.details = payloadError?.details;
    err.response = res;
    err.payload = json;
    err.rawBody = text;

    const isUnauthorized =
      res.status === 401 ||
      err.code === 'AUTH_REQUIRED' ||
      err.code === 'AUTH_INVALID' ||
      err.code === 'UNAUTHORIZED';

    if (isUnauthorized) {
      await logout({ redirect: true, skipRequest: true });
    }

    if (!isUnauthorized && showErrorToast && (KNOWN_ERROR_STATUS.has(res.status) || ERROR_MESSAGES[err.code])) {
      const toastMessage = resolveErrorMessage(res.status, err.code, errMessage, errorMessage);
      showSnackbar(toastMessage, { type: 'error', code: err.code });
    }

    if (IS_DEV) {
      console.warn('[apiFetch] error response', { ...responseDebug, code: err.code });
      if (text) {
        console.error('[apiFetch] payload', { body: text });
      }
    }

    throw err;
  }

  if (IS_DEV) {
    console.debug('[apiFetch] response', responseDebug);
  }

  if (json && typeof json === 'object' && json.ok === undefined) {
    json.ok = true;
  }

  return json;
}

export async function fetchMe({ force = false, silent = true } = {}) {
  if (!isAuthenticated()) {
    resetAuthCache();
    return null;
  }

  if (authState.hydrated && !force) {
    return {
      user: authState.user,
      permissions: { ...authState.permissions }
    };
  }

  if (authState.hydratePromise && !force) {
    return authState.hydratePromise;
  }

  const request = (async () => {
    const response = await apiFetch('/auth/me', {
      method: 'GET',
      showErrorToast: !silent
    });

    const user = response?.data?.user || null;
    const rawPerms =
      response?.data?.permissions ||
      response?.data?.effectivePermissions ||
      {};
    const permissions = normalizePermissionMap(rawPerms);

    authState.user = user;
    authState.roleId = user?.roleId || null;
    authState.permissions = permissions;
    authState.hydrated = true;

    try {
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');
    } catch { /* ignore */ }

    try {
      if (authState.roleId) sessionStorage.setItem('auth.roleId', authState.roleId);
      else sessionStorage.removeItem('auth.roleId');
    } catch { /* ignore */ }

    try {
      sessionStorage.setItem('effectivePermissions', JSON.stringify(permissions));
    } catch { /* ignore */ }

    try {
      await setServerSession?.(authState.roleId, permissions);
    } catch { /* ignore */ }

    return { user, permissions };
  })()
    .catch((error) => {
      if (IS_DEV) {
        console.warn('[auth] fetchMe failed', error);
      }
      resetAuthCache();
      throw error;
    })
    .finally(() => {
      authState.hydratePromise = null;
    });

  authState.hydratePromise = request;
  return request;
}

export async function ensureAuthReady({ silent = true } = {}) {
  if (!isAuthenticated()) {
    resetAuthCache();
    return false;
  }

  if (authState.hydrated) return true;

  try {
    await fetchMe({ force: false, silent });
    return true;
  } catch {
    return false;
  }
}

export function pickHomeRoute(permissions = null) {
  const map = permissions && typeof permissions === 'object' && !Array.isArray(permissions)
    ? permissions
    : authState.permissions;

  const hasRead = (key) => {
    const normalized = typeof key === 'string' ? key.trim().toLowerCase() : '';
    if (!normalized) return false;
    const perms = map?.[normalized];
    return !!(perms && perms.r);
  };

  if (hasRead('dashboard')) return '#dashboard';
  for (const key of HOME_ROUTE_FALLBACK) {
    if (hasRead(key)) return `#${key}`;
  }
  return '#not-authorized';
}

export async function login(email, password) {
  resetAuthCache();

  const { data } = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    showErrorToast: false
  });

  if (!data?.token) {
    throw Object.assign(new Error('No se pudo iniciar sesión.'), { code: 'AUTH_INVALID' });
  }

  setToken(data.token);

  const fallbackRoleId = data?.user?.roleId || null;
  const fallbackPerms = normalizePermissionMap(
    data?.permissions || data?.effectivePermissions || {}
  );

  authState.permissions = fallbackPerms;
  authState.roleId = fallbackRoleId;

  try {
    if (data?.user) localStorage.setItem('user', JSON.stringify(data.user));
    else localStorage.removeItem('user');
  } catch { /* ignore */ }

  try {
    if (fallbackRoleId) sessionStorage.setItem('auth.roleId', fallbackRoleId);
    else sessionStorage.removeItem('auth.roleId');
  } catch { /* ignore */ }

  if (Object.keys(fallbackPerms).length) {
    try {
      sessionStorage.setItem('effectivePermissions', JSON.stringify(fallbackPerms));
    } catch { /* ignore */ }
    try {
      await setServerSession?.(fallbackRoleId, fallbackPerms);
    } catch { /* ignore */ }
  }

  let meResult;
  try {
    meResult = await fetchMe({ force: true, silent: true });
  } catch (err) {
    await logout({ redirect: false, skipRequest: true });
    throw err;
  }

  const permissions = meResult?.permissions || fallbackPerms;
  const user = meResult?.user || data?.user || null;
  const nextRoute = pickHomeRoute(permissions);

  return {
    token: data.token,
    user,
    permissions,
    nextRoute
  };
}

export async function logout({ redirect = true, skipRequest = false } = {}) {
  if (isLoggingOut) return;
  isLoggingOut = true;
  try {
    if (!skipRequest) {
      await performLogoutRequest();
    }
  } catch (err) {
    if (IS_DEV) {
      console.warn('[auth] logout flow error', err);
    }
  } finally {
    await clearAuthState({ redirect });
    isLoggingOut = false;
  }
}



