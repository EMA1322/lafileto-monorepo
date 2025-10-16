// /admin/src/utils/rbac.js
// ============================================================================
// RBAC helper (mock + server session) para construir y consultar permisos por rol
// - Código en inglés; comentarios en español.
// - Fuentes posibles:
//     1) effectivePermissions del backend (preferido) via setServerSession()
//     2) /data/rbac_permissions.json (seed mock para dev)
// - Overrides: localStorage 'rbac.permissions.override' (matriz editada en UI)
// - Persistencia de sesión: sessionStorage (roleId + permMap)
// - Compatibilidad: expone setRoleId() y setRole() (alias)
// - Soporta ambos formatos de seed:
//     A) role_permissions: { "role-id": { "module_key": {r,w,u,d}, ... }, ... }
//     B) role_permissions: [ { role_id, module_key, r, w, u, d }, ... ]
// ============================================================================

/* =========================
   Storage keys & in-memory cache
   ========================= */
const RBAC_ROLE_KEY = "rbac.roleId";
const RBAC_MAP_KEY  = "rbac.permMap";
const LS_PERM_OVERRIDE_KEY = "rbac.permissions.override";

let _roleId = null;
let _permMap = null;
let _seedCache = null; // cache del seed (una sola carga por sesión)

/* =========================
   Utilidades locales
   ========================= */

function normalizeModuleKey(value) {
  if (!value) return '';
  return String(value).replace(/^#/, '').trim().toLowerCase();
}

function normalizeServerPerms(map) {
  if (!map || typeof map !== 'object') return null;
  const normalized = {};
  for (const [key, value] of Object.entries(map)) {
    if (!key) continue;
    const mk = normalizeModuleKey(key);
    if (!mk) continue;
    const perms = value && typeof value === 'object' ? value : {};
    normalized[mk] = {
      r: !!perms.r,
      w: !!perms.w,
      u: !!perms.u,
      d: !!perms.d,
    };
  }
  return normalized;
}

/**
 * Carga permisos provenientes del backend y los persiste en sessionStorage.
 * - roleId: string del rol del usuario autenticado
 * - effectivePermissions: { [moduleKey]: { r, w, u, d } }
 */
export async function setServerSession(roleId, effectivePermissions) {
  _roleId = roleId || null;
  _permMap = normalizeServerPerms(effectivePermissions) || null;

  try {
    if (_roleId) sessionStorage.setItem(RBAC_ROLE_KEY, _roleId);
    else sessionStorage.removeItem(RBAC_ROLE_KEY);

    if (_permMap) {
      sessionStorage.setItem(RBAC_MAP_KEY, JSON.stringify(_permMap));
      sessionStorage.setItem('effectivePermissions', JSON.stringify(_permMap));
    } else {
      sessionStorage.removeItem(RBAC_MAP_KEY);
      sessionStorage.removeItem('effectivePermissions');
    }
  } catch {
    // Ignorar errores de storage (modo privado, cuotas, etc.)
  }
}

/** Parse seguro de JSON (sin arrojar errores) */
function safeParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** Lee JSON desde localStorage con fallback */
function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Normaliza un hash tipo "#products" → "products" */
export function moduleKeyFromHash(hash) {
  return normalizeModuleKey(hash);
}

/* =========================
   Seed loader
   ========================= */

/** Carga única del seed (cacheado en memoria) */
async function ensureSeedLoaded() {
  if (_seedCache) return _seedCache;
  const res = await fetch("/data/rbac_permissions.json", { cache: "no-store" });
  if (!res.ok) throw new Error("RBAC seed not available");
  _seedCache = await res.json();
  return _seedCache;
}

/** Normaliza el seed a: { [roleId]: { [module_key]: {r,w,u,d} } } */
function normalizeSeedToMap(seed) {
  const out = {};
  if (!seed || !seed.role_permissions) return out;

  const rp = seed.role_permissions;

  // Forma B (array de filas)
  if (Array.isArray(rp)) {
    for (const it of rp) {
      if (!it || !it.role_id || !it.module_key) continue;
      (out[it.role_id] ||= {})[it.module_key] = {
        r: !!it.r,
        w: !!it.w,
        u: !!it.u,
        d: !!it.d,
      };
    }
    return out;
  }

  // Forma A (objeto por rol)
  if (typeof rp === "object") {
    for (const [roleId, mods] of Object.entries(rp)) {
      out[roleId] ||= {};
      if (!mods || typeof mods !== "object") continue;
      for (const [mod, p] of Object.entries(mods)) {
        out[roleId][mod] = { r: !!p.r, w: !!p.w, u: !!p.u, d: !!p.d };
      }
    }
  }

  return out;
}

/** Construye permMap para un rol: base seed + overrides (si existen) */
function buildPermMapForRole(roleId, seed, overrides) {
  const seedMap = normalizeSeedToMap(seed);
  const base = seedMap[roleId] || {};
  const ov = (overrides && overrides[roleId]) || {};

  // Unión de módulos: los del seed + los del override + (opcional) seed.modules
  const union = new Set([
    ...(seed?.modules || []),
    ...Object.keys(base),
    ...Object.keys(ov),
  ]);

  const out = {};
  for (const mod of union) {
    const b = base[mod] || {};
    const o = ov[mod] || {};
    out[mod] = {
      r: o.r ?? !!b.r,
      w: o.w ?? !!b.w,
      u: o.u ?? !!b.u,
      d: o.d ?? !!b.d,
    };
  }
  return out;
}

/* =========================
   Carga / reconstrucción del RBAC en sesión
   ========================= */

/**
 * ensureRbacLoaded:
 *   0) Si ya hay permisos del backend en sessionStorage → usarlos y salir.
 *   1) Si hay roleId en sesión → reconstruir desde seed + overrides (modo dev).
 *   2) Persistir en sessionStorage para lecturas rápidas.
 */
export async function ensureRbacLoaded() {
  try {
    // 0) Fast path: si ya hay permMap en session (cargado vía setServerSession), usarlo.
    try {
      const cachedPerms = sessionStorage.getItem(RBAC_MAP_KEY);
      const cachedRole  = sessionStorage.getItem(RBAC_ROLE_KEY) || null;
      if (cachedPerms && cachedRole) {
        _roleId = cachedRole;
        const parsed = safeParse(cachedPerms, null);
        _permMap = normalizeServerPerms(parsed);
        if (_permMap) return; // ← permisos del servidor listos
      }
    } catch { /* ignore */ }

    // 1) Obtener roleId desde sessionStorage (si no hay, no hay permisos)
    try {
      const roleRaw = sessionStorage.getItem(RBAC_ROLE_KEY);
      _roleId = roleRaw || null;
    } catch {
      _roleId = null;
    }

    if (!_roleId) {
      _permMap = null;
      return;
    }

    // 2) seed + overrides (LS) → construir mapa final (modo dev/mock)
    const [seed, overrides] = await Promise.all([
      ensureSeedLoaded(),
      Promise.resolve(readLS(LS_PERM_OVERRIDE_KEY, {})),
    ]);

    _permMap = normalizeServerPerms(buildPermMapForRole(_roleId, seed, overrides)) || {};

    // Persistir en sesión para lecturas rápidas
    try {
      sessionStorage.setItem(RBAC_MAP_KEY, JSON.stringify(_permMap));
      sessionStorage.setItem('effectivePermissions', JSON.stringify(_permMap));
    } catch { /* ignore */ }
  } catch (e) {
    console.warn("[rbac] ensureRbacLoaded failed", e);
    _permMap = null;
  }
}

/**
 * Asigna el roleId actual y reconstruye los permisos inmediatamente.
 * Usar en el flujo de login / cambio de rol (modo seed).
 */
export async function setRoleId(roleId) {
  _roleId = roleId || null;
  try {
    if (_roleId) sessionStorage.setItem(RBAC_ROLE_KEY, _roleId);
    else sessionStorage.removeItem(RBAC_ROLE_KEY);
  } catch { /* ignore */ }
  await ensureRbacLoaded();
}

/** Alias para compatibilidad con versiones previas */
export const setRole = setRoleId;

/** Limpia RBAC (logout) */
export function clearRbac() {
  _roleId = null;
  _permMap = null;
  try {
    sessionStorage.removeItem(RBAC_ROLE_KEY);
    sessionStorage.removeItem(RBAC_MAP_KEY);
    sessionStorage.removeItem('effectivePermissions');
  } catch { /* ignore */ }
}

/* =========================
   Getters y predicados
   ========================= */

export function getRoleId() {
  // Intenta hidratar desde sesión si aún no está en memoria
  if (!_roleId) {
    try {
      _roleId = sessionStorage.getItem(RBAC_ROLE_KEY) || null;
    } catch {
      _roleId = null;
    }
  }
  return _roleId;
}

export function getPermMap() {
  if (_permMap) return _permMap;
  try {
    const raw = sessionStorage.getItem(RBAC_MAP_KEY);
    if (!raw) return {};
    _permMap = normalizeServerPerms(safeParse(raw, {})) || {};
    return _permMap;
  } catch {
    return {};
  }
}

function resolvePermission(moduleKey) {
  const key = normalizeModuleKey(moduleKey);
  if (!key) return null;
  const map = _permMap || getPermMap();
  return map?.[key] || null;
}

export function canRead(moduleKey) {
  const perm = resolvePermission(moduleKey);
  return Boolean(perm && perm.r);
}
export function canWrite(moduleKey) {
  const perm = resolvePermission(moduleKey);
  return Boolean(perm && perm.w);
}
export function canUpdate(moduleKey) {
  const perm = resolvePermission(moduleKey);
  return Boolean(perm && perm.u);
}
export function canDelete(moduleKey) {
  const perm = resolvePermission(moduleKey);
  return Boolean(perm && perm.d);
}
