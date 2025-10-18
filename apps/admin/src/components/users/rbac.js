import * as rbacClient from '@/utils/rbac.js';

export const MODULE_KEY = 'users';
export const MODULE_KEY_ALIAS = 'user';
export const ADMIN_ROLE_IDS = ['role-admin'];

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

function runClientCheck(action) {
  const client = rbacClient || {};
  const fn =
    action === 'write'
      ? client.canWrite
      : action === 'update'
      ? client.canUpdate
      : action === 'delete'
      ? client.canDelete
      : null;
  if (typeof fn !== 'function') return false;
  return fn(MODULE_KEY) || fn(MODULE_KEY_ALIAS);
}

export function canWriteUsers() {
  return runClientCheck('write');
}

export function canUpdateUsers() {
  return runClientCheck('update');
}

export function canDeleteUsers() {
  return runClientCheck('delete');
}

export function guardAction(action, { onDenied } = {}) {
  const check =
    action === 'write'
      ? canWriteUsers()
      : action === 'update'
      ? canUpdateUsers()
      : action === 'delete'
      ? canDeleteUsers()
      : false;
  if (!check && typeof onDenied === 'function') {
    onDenied();
  }
  return check;
}
