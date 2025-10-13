import { normalizeText, createId as helpersCreateId } from "@/utils/helpers.js";

export function generateId(prefix = "id") {
  if (typeof helpersCreateId === "function") return helpersCreateId(prefix);
  const rand = Math.random().toString(36).slice(2, 8);
  const now = Date.now().toString(36);
  return `${prefix}-${now}${rand}`;
}

export function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function norm(str) {
  try {
    return normalizeText ? normalizeText(String(str)) : String(str).toLowerCase();
  } catch {
    return String(str).toLowerCase();
  }
}

export function formatDateDDMMYYYY(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function mapErrorToMessage(err, fallback = "Ocurrió un error.") {
  const code = err?.code || "";
  if (code === "VALIDATION_ERROR") return "Revisá los datos: hay campos inválidos.";
  if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID") return "Iniciá sesión / Tu sesión expiró.";
  if (code === "PERMISSION_DENIED") return "No tenés permisos para esta acción.";
  if (code === "RESOURCE_NOT_FOUND") return "El recurso no existe o fue eliminado.";
  if (code === "CONFLICT" || code === "RESOURCE_CONFLICT") return "Operación en conflicto. Revisá los datos.";
  if (code === "RATE_LIMITED") return "Demasiadas solicitudes. Probá en unos minutos.";
  return err?.message || fallback;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function buildRolePermsMap(seed) {
  const out = {};
  if (!seed || !seed.role_permissions) return out;
  const rp = seed.role_permissions;

  if (Array.isArray(rp)) {
    for (const item of rp) {
      if (!item || !item.role_id || !item.module_key) continue;
      out[item.role_id] = out[item.role_id] || {};
      out[item.role_id][item.module_key] = {
        r: !!item.r,
        w: !!item.w,
        u: !!item.u,
        d: !!item.d,
      };
    }
  } else if (typeof rp === "object") {
    for (const [roleId, modules] of Object.entries(rp)) {
      out[roleId] = out[roleId] || {};
      if (modules && typeof modules === "object") {
        for (const [mod, perm] of Object.entries(modules)) {
          out[roleId][mod] = {
            r: !!perm.r,
            w: !!perm.w,
            u: !!perm.u,
            d: !!perm.d,
          };
        }
      }
    }
  }

  return out;
}
