import { canWrite, canUpdate, canDelete } from '@/utils/rbac.js';

export const MODULE_KEY = 'users';
export const MODULE_KEY_ALIAS = 'user';
export const ADMIN_ROLE_IDS = ['role-admin'];

export function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function mapErrorToMessage(err, fallback = 'Ocurrió un error.') {
  const code = err?.code || '';
  if (code === 'VALIDATION_ERROR') return 'Revisá los datos: hay campos inválidos.';
  if (code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID') return 'Iniciá sesión / Tu sesión expiró.';
  if (code === 'PERMISSION_DENIED') return 'No tenés permisos para esta acción.';
  if (code === 'RESOURCE_NOT_FOUND') return 'El recurso no existe o fue eliminado.';
  if (code === 'CONFLICT' || code === 'RESOURCE_CONFLICT') return 'Operación en conflicto. Revisá los datos.';
  if (code === 'ROLE_IN_USE') return 'No se puede eliminar: hay usuarios asignados a este rol.';
  if (code === 'SELF_DELETE_FORBIDDEN') return 'No podés eliminar tu propio usuario.';
  if (code === 'LAST_ADMIN_FORBIDDEN') return 'No se puede eliminar el último administrador.';
  if (code === 'RATE_LIMITED') return 'Demasiadas solicitudes. Probá en unos minutos.';
  return err?.message || fallback;
}

const VALID_ICON_SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl']);

function escapeAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeIconSize(size) {
  return VALID_ICON_SIZES.has(size) ? size : 'sm';
}

export function createButtonTemplate({
  label = '',
  iconName,
  iconSize = 'sm',
  iconTitle,
  labelClass = 'icon-label',
  srLabel,
  showLabel = true,
} = {}) {
  const normalizedSize = normalizeIconSize(iconSize);
  const hasIcon = Boolean(iconName);
  const iconTitleAttr = iconTitle ? ` data-icon-title="${escapeAttr(iconTitle)}"` : '';
  const iconMarkup = hasIcon
    ? `<span class="icon icon--${normalizedSize}" data-icon="${escapeAttr(iconName)}"${iconTitleAttr} aria-hidden="true"></span>`
    : '';
  const visibleLabel = showLabel && label
    ? `<span class="${labelClass}">${escapeHTML(label)}</span>`
    : '';
  const srOnly = srLabel ? `<span class="sr-only">${escapeHTML(srLabel)}</span>` : '';

  return `${iconMarkup}${visibleLabel}${srOnly}`.trim();
}

export function computeIsAdmin({ roleId } = {}) {
  const rid = roleId ? String(roleId).toLowerCase() : '';
  if (ADMIN_ROLE_IDS.includes(rid)) return true;

  try {
    const raw = sessionStorage.getItem('effectivePermissions');
    if (!raw) return false;
    const map = JSON.parse(raw);
    return Object.values(map || {}).every((p) => p && p.r && p.w && p.u && p.d);
  } catch {
    return false;
  }
}

export function guardAction(
  action,
  {
    roleId,
    snackWarn,
  } = {},
) {
  const warn = snackWarn || (() => {});
  const clients = {
    write: () => (canWrite?.(MODULE_KEY) || canWrite?.(MODULE_KEY_ALIAS)) ?? false,
    update: () => (canUpdate?.(MODULE_KEY) || canUpdate?.(MODULE_KEY_ALIAS)) ?? false,
    delete: () => (canDelete?.(MODULE_KEY) || canDelete?.(MODULE_KEY_ALIAS)) ?? false,
  };

  let ok = true;
  if (action === 'write') {
    ok = clients.write();
  } else if (action === 'update') {
    ok = clients.update();
  } else if (action === 'delete') {
    ok = clients.delete();
    if (String(roleId).toLowerCase() === 'role-supervisor') ok = false;
  }

  if (!ok) warn('No tenés permisos para esta acción.', 'PERMISSION_DENIED');
  return ok;
}

export function buildRolePermsMap(seed) {
  if (!seed || typeof seed !== 'object') {
    return {};
  }

  const source = seed.role_permissions;
  if (!source) return {};

  const output = {};

  if (Array.isArray(source)) {
    source.forEach((entry) => {
      if (!entry || !entry.role_id || !entry.module_key) return;
      const roleId = String(entry.role_id);
      const moduleKey = String(entry.module_key);
      output[roleId] ||= {};
      output[roleId][moduleKey] = {
        r: !!entry.r,
        w: !!entry.w,
        u: !!entry.u,
        d: !!entry.d,
      };
    });
    return output;
  }

  if (typeof source === 'object') {
    Object.entries(source).forEach(([roleId, modules]) => {
      if (!roleId || !modules || typeof modules !== 'object') return;
      output[roleId] ||= {};
      Object.entries(modules).forEach(([moduleKey, perms]) => {
        if (!moduleKey || !perms || typeof perms !== 'object') return;
        output[roleId][moduleKey] = {
          r: !!perms.r,
          w: !!perms.w,
          u: !!perms.u,
          d: !!perms.d,
        };
      });
    });
  }

  return output;
}

export function getRoleLabel(roleId, rolesById) {
  const normalizedRoleId = String(roleId || '').trim();
  if (!normalizedRoleId) return '—';

  const roleName = rolesById?.get(normalizedRoleId);
  if (!roleName) return '—';

  const normalizedRoleName = String(roleName).trim();
  return normalizedRoleName || '—';
}
