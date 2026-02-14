import { apiFetch } from '../../utils/api.js';
import { applyRBAC, canWrite } from '../../utils/rbac.js';
import { toast } from '../../utils/toast.js';

const STATUS = {
  LOADING: 'loading',
  ERROR: 'error',
  EMPTY: 'empty',
  SUCCESS: 'success',
};

const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const OVERRIDE_OPTIONS = ['AUTO', 'FORCE_OPEN', 'FORCE_CLOSED'];
const DEFAULT_WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const state = {
  siteConfig: null,
  openingHoursTemplate: [],
  isSaving: false,
};

function getRefs() {
  const container = document.querySelector('#settings-module');
  if (!container) return null;

  const content = container.querySelector('.settings__content');
  const form = container.querySelector('#settings-hours-form');

  return {
    container,
    content,
    form,
    errorMessage: container.querySelector('#settings-error-message'),
    retryBtn: container.querySelector('#settings-retry'),
    reloadBtn: container.querySelector('#settings-reload'),
    successCard: container.querySelector('#settings-success'),
    loadingState: container.querySelector('#settings-loading'),
    errorState: container.querySelector('#settings-error'),
    emptyState: container.querySelector('#settings-empty'),
    formError: container.querySelector('#settings-form-error'),
    hoursGrid: container.querySelector('#settings-hours-grid'),
    overrideSelect: container.querySelector('#hours-override'),
    alertEnabled: container.querySelector('#hours-alert-enabled'),
    alertMessage: container.querySelector('#hours-alert-message'),
    saveBtn: container.querySelector('#settings-save'),
    readonlyHint: container.querySelector('#settings-readonly-hint'),
  };
}

function setStatus(refs, status, message = '') {
  if (!refs?.content) return;
  refs.content.dataset.status = status;
  refs.content.classList.toggle('is-loading', status === STATUS.LOADING);
  refs.content.classList.toggle('has-error', status === STATUS.ERROR);
  refs.content.classList.toggle('is-empty', status === STATUS.EMPTY);
  refs.content.classList.toggle('has-success', status === STATUS.SUCCESS);
  refs.content.setAttribute('aria-busy', status === STATUS.LOADING ? 'true' : 'false');

  refs.loadingState.hidden = status !== STATUS.LOADING;
  refs.errorState.hidden = status !== STATUS.ERROR;
  refs.emptyState.hidden = status !== STATUS.EMPTY;
  refs.successCard.hidden = status !== STATUS.SUCCESS;

  if (message && refs.errorMessage) {
    refs.errorMessage.textContent = message;
  }
}

function isEmptySettings(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function resolveErrorMessage(error) {
  if (!error) return 'No pudimos cargar la configuración. Intentá nuevamente.';
  if (error.status === 401) return 'Tu sesión expiró. Iniciá sesión nuevamente para continuar.';
  if (error.status === 403) return 'No tenés permisos para ver la configuración del sistema.';
  return error.message || 'No pudimos cargar la configuración. Intentá nuevamente.';
}

function setFormError(refs, message = '') {
  if (!refs?.formError) return;

  refs.formError.textContent = message;
  refs.formError.hidden = !message;
}

function getFieldErrors(refs) {
  const nodes = refs?.container?.querySelectorAll('[data-error-for]') || [];
  return Array.from(nodes);
}

function clearFieldErrors(refs) {
  for (const node of getFieldErrors(refs)) {
    node.hidden = true;
    node.textContent = '';
  }
}

function normalizePath(path) {
  return String(path || '')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .trim();
}

function setFieldError(refs, path, message) {
  const normalizedPath = normalizePath(path);
  const fieldErrorNode = refs?.container?.querySelector(`[data-error-for="${normalizedPath}"]`);

  if (fieldErrorNode) {
    fieldErrorNode.textContent = message;
    fieldErrorNode.hidden = false;
    return true;
  }

  const field = refs?.form?.elements?.namedItem(normalizedPath);
  if (field) {
    const nearestError = field.closest('.settings__row, .settings__field')?.querySelector('.settings__field-error');
    if (nearestError) {
      nearestError.textContent = message;
      nearestError.hidden = false;
      return true;
    }
  }

  return false;
}

function mapBackendFieldErrors(refs, error) {
  const fields = error?.details?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return false;

  clearFieldErrors(refs);

  let mappedAtLeastOne = false;

  for (const fieldError of fields) {
    const rawPath = normalizePath(fieldError?.path);
    const message = fieldError?.message || 'Valor inválido.';

    if (!rawPath) continue;

    if (setFieldError(refs, rawPath, message)) {
      mappedAtLeastOne = true;
      continue;
    }

    if (rawPath.startsWith('hours.openingHours.')) {
      if (setFieldError(refs, 'hours.openingHours', message)) {
        mappedAtLeastOne = true;
      }
    }
  }

  return mappedAtLeastOne;
}

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function createRow({ day, index }) {
  const row = document.createElement('div');
  row.className = 'settings__row';

  const dayLabel = document.createElement('div');
  dayLabel.className = 'settings__day';
  dayLabel.textContent = day;

  const closedLabel = document.createElement('label');
  closedLabel.className = 'settings__field settings__field--inline settings__closed';

  const closedToggle = document.createElement('input');
  closedToggle.type = 'checkbox';
  closedToggle.name = `hours.openingHours.${index}.closed`;
  closedToggle.dataset.role = 'closed';

  const closedText = document.createElement('span');
  closedText.className = 'settings__label';
  closedText.textContent = 'Closed';

  closedLabel.append(closedToggle, closedText);

  const openField = document.createElement('label');
  openField.className = 'settings__field';

  const openLabel = document.createElement('span');
  openLabel.className = 'settings__label';
  openLabel.textContent = 'Open';

  const openInput = document.createElement('input');
  openInput.type = 'time';
  openInput.name = `hours.openingHours.${index}.open`;
  openInput.className = 'input';
  openInput.dataset.role = 'open';

  openField.append(openLabel, openInput);

  const closeField = document.createElement('label');
  closeField.className = 'settings__field';

  const closeLabel = document.createElement('span');
  closeLabel.className = 'settings__label';
  closeLabel.textContent = 'Close';

  const closeInput = document.createElement('input');
  closeInput.type = 'time';
  closeInput.name = `hours.openingHours.${index}.close`;
  closeInput.className = 'input';
  closeInput.dataset.role = 'close';

  closeField.append(closeLabel, closeInput);

  const inlineError = document.createElement('p');
  inlineError.className = 'settings__field-error';
  inlineError.dataset.errorFor = `hours.openingHours.${index}`;
  inlineError.hidden = true;

  row.append(dayLabel, closedLabel, openField, closeField, inlineError);

  closedToggle.addEventListener('change', () => {
    const closed = closedToggle.checked;
    openInput.disabled = closed;
    closeInput.disabled = closed;
    if (closed) {
      openInput.value = '';
      closeInput.value = '';
    }
  });

  return row;
}

function ensureHoursRows(refs, openingHours) {
  if (!refs?.hoursGrid) return;

  const source = Array.isArray(openingHours) && openingHours.length > 0
    ? openingHours
    : DEFAULT_WEEK_DAYS.map((day) => ({ day, open: '', close: '', closed: false }));

  const normalized = source.slice(0, 7);
  while (normalized.length < 7) {
    normalized.push({ day: DEFAULT_WEEK_DAYS[normalized.length], open: '', close: '', closed: false });
  }

  state.openingHoursTemplate = normalized.map((slot, index) => ({
    day: typeof slot?.day === 'string' && slot.day.trim() ? slot.day.trim() : DEFAULT_WEEK_DAYS[index],
    open: typeof slot?.open === 'string' ? slot.open : '',
    close: typeof slot?.close === 'string' ? slot.close : '',
    closed: Boolean(slot?.closed),
  }));

  refs.hoursGrid.textContent = '';

  state.openingHoursTemplate.forEach((slot, index) => {
    const row = createRow({ day: slot.day, index });
    refs.hoursGrid.append(row);
  });
}

function setReadOnlyState(refs) {
  const writable = canWrite('settings');

  if (refs?.readonlyHint) {
    refs.readonlyHint.hidden = writable;
  }

  if (!refs?.form) return;

  const controls = refs.form.querySelectorAll('input, select, textarea');
  controls.forEach((control) => {
    if (control === refs.saveBtn) return;
    control.disabled = !writable;
  });
}

function prefillForm(refs, config) {
  const hours = config?.hours || {};
  ensureHoursRows(refs, hours.openingHours);

  if (refs.overrideSelect) {
    refs.overrideSelect.textContent = '';
    OVERRIDE_OPTIONS.forEach((option) => {
      const entry = document.createElement('option');
      entry.value = option;
      entry.textContent = option;
      refs.overrideSelect.append(entry);
    });
    refs.overrideSelect.value = OVERRIDE_OPTIONS.includes(hours.override) ? hours.override : 'AUTO';
  }

  if (refs.alertEnabled) {
    refs.alertEnabled.checked = Boolean(hours?.alert?.enabled);
  }

  if (refs.alertMessage) {
    refs.alertMessage.value = typeof hours?.alert?.message === 'string' ? hours.alert.message : '';
  }

  state.openingHoursTemplate.forEach((slot, index) => {
    const openInput = refs.form?.elements?.namedItem(`hours.openingHours.${index}.open`);
    const closeInput = refs.form?.elements?.namedItem(`hours.openingHours.${index}.close`);
    const closedToggle = refs.form?.elements?.namedItem(`hours.openingHours.${index}.closed`);

    if (openInput) openInput.value = slot.open || '';
    if (closeInput) closeInput.value = slot.close || '';
    if (closedToggle) {
      closedToggle.checked = Boolean(slot.closed);
      openInput.disabled = closedToggle.checked;
      closeInput.disabled = closedToggle.checked;
    }
  });

  setReadOnlyState(refs);
}

function collectHoursPayload(refs) {
  const openingHours = state.openingHoursTemplate.map((slot, index) => {
    const openInput = refs.form?.elements?.namedItem(`hours.openingHours.${index}.open`);
    const closeInput = refs.form?.elements?.namedItem(`hours.openingHours.${index}.close`);
    const closedToggle = refs.form?.elements?.namedItem(`hours.openingHours.${index}.closed`);

    const closed = Boolean(closedToggle?.checked);

    return {
      day: slot.day,
      closed,
      open: closed ? '' : String(openInput?.value || '').trim(),
      close: closed ? '' : String(closeInput?.value || '').trim(),
    };
  });

  return {
    timezone: state.siteConfig?.hours?.timezone || 'America/Argentina/San_Luis',
    openingHours,
    override: refs.overrideSelect?.value || 'AUTO',
    alert: {
      enabled: Boolean(refs.alertEnabled?.checked),
      message: String(refs.alertMessage?.value || ''),
    },
  };
}

function validateHours(payload) {
  const fieldErrors = new Map();

  if (!OVERRIDE_OPTIONS.includes(payload.override)) {
    fieldErrors.set('hours.override', 'Seleccioná una opción válida.');
  }

  payload.openingHours.forEach((slot, index) => {
    if (slot.closed) return;

    const hasOpen = Boolean(slot.open);
    const hasClose = Boolean(slot.close);

    if ((hasOpen && !HH_MM_REGEX.test(slot.open)) || (hasClose && !HH_MM_REGEX.test(slot.close))) {
      fieldErrors.set(`hours.openingHours.${index}`, 'Usá formato HH:MM en 24h.');
      return;
    }

    if (hasOpen && hasClose && toMinutes(slot.open) >= toMinutes(slot.close)) {
      fieldErrors.set(`hours.openingHours.${index}`, 'La hora de apertura debe ser menor al cierre.');
    }
  });

  if (payload.alert.enabled && !String(payload.alert.message || '').trim()) {
    fieldErrors.set('hours.alert.message', 'Ingresá un mensaje cuando la alerta está habilitada.');
  }

  return fieldErrors;
}

function mergeHoursPayload(payload) {
  return {
    ...(state.siteConfig || {}),
    hours: payload,
  };
}

async function saveSettings(refs) {
  if (state.isSaving || !refs?.form) return;

  clearFieldErrors(refs);
  setFormError(refs, '');

  const hoursPayload = collectHoursPayload(refs);
  const validationErrors = validateHours(hoursPayload);

  if (validationErrors.size > 0) {
    validationErrors.forEach((message, path) => {
      setFieldError(refs, path, message);
    });

    setFormError(refs, 'Revisá los campos con errores antes de guardar.');
    return;
  }

  state.isSaving = true;
  if (refs.saveBtn) refs.saveBtn.disabled = true;

  try {
    const response = await apiFetch('/settings', {
      method: 'PUT',
      body: mergeHoursPayload(hoursPayload),
      showErrorToast: false,
      redirectOn401: false,
    });

    state.siteConfig = response?.data || mergeHoursPayload(hoursPayload);
    prefillForm(refs, state.siteConfig);
    toast.success('Configuración guardada correctamente.');
  } catch (error) {
    const hasMappedFields = error?.status === 400 ? mapBackendFieldErrors(refs, error) : false;

    const fallbackMessage = error?.message || 'No se pudo guardar la configuración.';
    setFormError(refs, hasMappedFields ? 'Hay errores de validación para corregir.' : fallbackMessage);
    toast.error(fallbackMessage);
  } finally {
    state.isSaving = false;
    if (refs.saveBtn) refs.saveBtn.disabled = false;
  }
}

async function loadSettings(refs) {
  setStatus(refs, STATUS.LOADING);
  setFormError(refs, '');
  clearFieldErrors(refs);

  try {
    const response = await apiFetch('/settings', {
      method: 'GET',
      showErrorToast: false,
      redirectOn401: false,
    });

    const payload = response?.data ?? null;
    if (isEmptySettings(payload)) {
      setStatus(refs, STATUS.EMPTY);
      return;
    }

    state.siteConfig = payload;
    prefillForm(refs, payload);

    applyRBAC(refs.container);
    setStatus(refs, STATUS.SUCCESS);
  } catch (error) {
    setStatus(refs, STATUS.ERROR, resolveErrorMessage(error));
  }
}

export function initSettings() {
  const refs = getRefs();
  if (!refs) return;
  if (refs.container.dataset.settingsInit === 'true') {
    return;
  }

  refs.container.dataset.settingsInit = 'true';

  refs.retryBtn?.addEventListener('click', () => {
    void loadSettings(refs);
  });

  refs.reloadBtn?.addEventListener('click', () => {
    void loadSettings(refs);
  });

  refs.form?.addEventListener('submit', (event) => {
    event.preventDefault();
    void saveSettings(refs);
  });

  void loadSettings(refs);
}

export default {
  initSettings,
};
