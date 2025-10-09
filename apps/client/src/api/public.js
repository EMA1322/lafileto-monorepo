// src/api/public.js
// ======================================================
// Public API client (envelope { ok, data, error, meta })
// - Sin side-effects: NO escribe en localStorage por defecto
// - Compatible con Vite env: import.meta.env.VITE_API_BASE_URL
// - Permite override en runtime con window.__API_BASE o localStorage.API_BASE
// - Mantiene la API: publicFetch(path), fetchPublicCategories(...)
// ======================================================

/**
 * Resuelve la URL base de la API sin escribir en localStorage.
 * Prioridad (de mayor a menor):
 * 1) window.__API_BASE        (override en runtime)
 * 2) localStorage.API_BASE    (override manual persistido)  ← solo se LEE
 * 3) import.meta.env.VITE_API_BASE_URL  (build-time de Vite)
 * 4) fallback: http://localhost:3000/api/v1
 */
function resolveApiBase() {
  const fromWindow =
    typeof window !== "undefined" &&
    window.__API_BASE &&
    String(window.__API_BASE).trim();

  const fromLS =
    typeof localStorage !== "undefined" &&
    localStorage.getItem &&
    localStorage.getItem("API_BASE"); // ← solo lectura

  const fromEnv =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL;

  const base = fromWindow || fromLS || fromEnv || "http://localhost:3000/api/v1";
  return String(base).replace(/\/+$/, ""); // normaliza sin slash final
}

export const API_BASE = resolveApiBase();

/**
 * Une base + path evitando dobles slashes y respetando URLs absolutas.
 * @param {string} base
 * @param {string} path
 */
function joinUrl(base, path) {
  const p = String(path || "");
  if (!p) return base;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
}

/**
 * Fetch público que entiende el envelope { ok, data, error, meta }
 * - No cambia la UX ni el contrato de retorno.
 * @param {string} path - Ej: "/categories?..."
 * @param {RequestInit} [options]
 * @returns {Promise<{ok:boolean, data?:any, error?:any, meta?:any}>}
 */
export async function publicFetch(path, options = {}) {
  const url = joinUrl(API_BASE, path);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    ...options
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.ok === false) {
    // Conserva política de errores estable y útil para el front
    const code = json?.error?.code || res.status;
    const msg = json?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = code;
    err.status = res.status;
    err.url = url;
    throw err;
  }

  return json; // { ok, data, meta }
}

/**
 * GET /categories (público)
 * @param {{ q?: string, page?: number, pageSize?: number }} [params]
 * @returns {Promise<Array>} - Array de categorías activas ordenadas por name ASC
 */
export async function fetchPublicCategories({ q = "", page = 1, pageSize = 20 } = {}) {
  const qs = new URLSearchParams({
    page,
    pageSize,
    ...(q ? { q } : {})
  }).toString();

  const { data } = await publicFetch(`/categories?${qs}`);
  return data;
}

/**
 * setApiBase(base, { persist }) — opcional para pruebas o overrides manuales
 * - NO se usa automáticamente. Llamalo si necesitás cambiar la base en runtime.
 * - Si persist=true, guarda en localStorage (llamado explícito).
 * @param {string} base
 * @param {{ persist?: boolean }} [opts]
 */
export function setApiBase(base, { persist = false } = {}) {
  const normalized = String(base || "").trim().replace(/\/+$/, "");
  if (!normalized) return;

  // runtime override (no requiere recargar)
  if (typeof window !== "undefined") {
    window.__API_BASE = normalized;
  }

  // persistencia opcional (solo si se pide explícitamente)
  if (persist && typeof localStorage !== "undefined" && localStorage.setItem) {
    localStorage.setItem("API_BASE", normalized);
  }
}
