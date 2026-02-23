import { UI_STATUS, normalizeUiStatus } from './status.helpers.js';

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getProductStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'active' || normalized === UI_STATUS.ACTIVE) {
    return { label: 'Activo', className: 'chip chip--success chip--sm' };
  }
  if (normalized === 'draft' || normalized === 'borrador') {
    return { label: 'Borrador', className: 'chip chip--info chip--sm' };
  }
  if (normalized === 'archived' || normalized === 'archivado') {
    return { label: 'Archivado', className: 'chip chip--warning chip--sm' };
  }
  if (normalized === 'inactive' || normalized === UI_STATUS.INACTIVE || normalized === 'inactivo') {
    return { label: 'Inactivo', className: 'chip chip--warning chip--sm' };
  }
  return { label: 'Desconocido', className: 'chip chip--sm' };
}

function getActiveInactiveStatus(value) {
  if (typeof value === 'boolean') {
    return value
      ? { label: 'Activo', className: 'chip chip--success chip--sm' }
      : { label: 'Inactivo', className: 'chip chip--warning chip--sm' };
  }

  const normalized = normalizeUiStatus(value, null);
  if (normalized === UI_STATUS.ACTIVE) {
    return { label: 'Activo', className: 'chip chip--success chip--sm' };
  }
  if (normalized === UI_STATUS.INACTIVE) {
    return { label: 'Inactivo', className: 'chip chip--warning chip--sm' };
  }
  return { label: 'Desconocido', className: 'chip chip--sm' };
}

export function getStatusChip(spec = {}) {
  const domain = String(spec.domain || '').toLowerCase();
  if (domain === 'product') return getProductStatus(spec.value);
  if (domain === 'user' || domain === 'category') return getActiveInactiveStatus(spec.value);
  return { label: 'Desconocido', className: 'chip chip--sm' };
}

export function renderStatusChip(spec = {}) {
  const statusChip = getStatusChip(spec);
  return `<span class="${escapeHTML(statusChip.className)}">${escapeHTML(statusChip.label)}</span>`;
}

