function resolveApiBase() {
  const fromWindow =
    typeof window !== "undefined" &&
    window.__API_BASE &&
    String(window.__API_BASE).trim();

  const fromLS =
    typeof localStorage !== "undefined" &&
    localStorage.getItem &&
    localStorage.getItem("API_BASE");

  const fromEnv =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL;

  const base = fromWindow || fromLS || fromEnv || "http://localhost:3000/api/v1";
  return String(base).replace(/\/+$/, "");
}

export const API_BASE = resolveApiBase();

function joinUrl(base, path) {
  const p = String(path || "");
  if (!p) return base;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
}

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
    const code = json?.error?.code || res.status;
    const msg = json?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = code;
    err.status = res.status;
    err.url = url;
    throw err;
  }

  return json;
}

export async function fetchPublicProducts() {
  const { data } = await publicFetch("/public/products");
  return Array.isArray(data) ? data : [];
}

export async function fetchPublicCategories() {
  const { data } = await publicFetch("/public/categories");
  return Array.isArray(data) ? data : [];
}

export async function fetchPublicOffers() {
  const { data } = await publicFetch("/public/offers");
  return Array.isArray(data) ? data : [];
}

export async function fetchPublicSettings() {
  const { data } = await publicFetch("/public/settings");
  return data || {};
}

export async function fetchBusinessStatus() {
  const { data } = await publicFetch("/public/business-status");
  return data || { isOpen: false };
}

export async function fetchCommercialConfig() {
  const { data } = await publicFetch("/public/commercial-config");
  return data || { whatsapp: { number: "", message: "" } };
}
