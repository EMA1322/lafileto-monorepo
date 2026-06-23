import { ADMIN_ROLE_ID } from './roles.helpers.js';

export function canAccessUserManagement(roleId = '') {
  return String(roleId || '').trim() === ADMIN_ROLE_ID;
}

export function getUserManagementRestrictionMessage() {
  return 'No tenes permisos para gestionar usuarios, roles o permisos.';
}
