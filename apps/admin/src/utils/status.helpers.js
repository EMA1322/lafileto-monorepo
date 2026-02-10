export const UI_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const UI_STATUS_LABELS = {
  [UI_STATUS.ACTIVE]: 'Activo',
  [UI_STATUS.INACTIVE]: 'Inactivo',
};

export const UI_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: UI_STATUS.ACTIVE, label: UI_STATUS_LABELS[UI_STATUS.ACTIVE] },
  { value: UI_STATUS.INACTIVE, label: UI_STATUS_LABELS[UI_STATUS.INACTIVE] },
];

export function getUiStatusLabel(uiStatus) {
  return UI_STATUS_LABELS[uiStatus] || '—';
}

export function normalizeUiStatus(value, fallback = UI_STATUS.INACTIVE) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === UI_STATUS.ACTIVE || normalized === UI_STATUS.INACTIVE) {
    return normalized;
  }
  return fallback;
}

export function productApiStatusToUi(apiStatus) {
  return String(apiStatus || '').toLowerCase() === 'active' ? UI_STATUS.ACTIVE : UI_STATUS.INACTIVE;
}

export function uiToProductApiStatus(uiStatus, { inactiveFallback = 'draft' } = {}) {
  return normalizeUiStatus(uiStatus) === UI_STATUS.ACTIVE ? 'active' : inactiveFallback;
}

export function categoryApiActiveToUi(apiActive) {
  return apiActive === true ? UI_STATUS.ACTIVE : UI_STATUS.INACTIVE;
}

export function uiToCategoryApiActive(uiStatus) {
  return normalizeUiStatus(uiStatus) === UI_STATUS.ACTIVE;
}

export function userApiStatusToUi(apiStatus) {
  return String(apiStatus || '').toUpperCase() === 'ACTIVE' ? UI_STATUS.ACTIVE : UI_STATUS.INACTIVE;
}

export function uiToUserApiStatus(uiStatus) {
  return normalizeUiStatus(uiStatus) === UI_STATUS.ACTIVE ? 'ACTIVE' : 'INACTIVE';
}
