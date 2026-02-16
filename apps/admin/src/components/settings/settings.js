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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CBU_LENGTH = 22;
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
  socialLinksTemplate: [],
  socialLinksIndexMap: [],
  isSaving: false,
};

function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function formatCbuMask(value) {
  const digits = normalizeDigits(value).slice(0, CBU_LENGTH);
  const parts = digits.match(/.{1,4}/g) || [];
  return parts.join(' ');
}

function isValidHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractEmbedSrc(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!raw.includes('<iframe')) return raw;

  const match = raw.match(/src\s*=\s*['\"]([^'\"]+)['\"]/i);
  return match?.[1]?.trim() || '';
}

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
    alertMessageWarning: container.querySelector('#hours-alert-message-warning'),
    identityPhone: container.querySelector('#identity-phone'),
    identityEmail: container.querySelector('#identity-email'),
    identityAddress: container.querySelector('#identity-address'),
    whatsappNumber: container.querySelector('#whatsapp-number'),
    whatsappMessage: container.querySelector('#whatsapp-message'),
    socialLinksList: container.querySelector('#social-links-list'),
    addSocialLinkBtn: container.querySelector('#social-links-add'),
    mapEmbedSrc: container.querySelector('#map-embed-src'),
    paymentsEnabled: container.querySelector('#payments-enabled'),
    paymentsBankName: container.querySelector('#payments-bank-name'),
    paymentsCbu: container.querySelector('#payments-cbu'),
    paymentsAlias: container.querySelector('#payments-alias'),
    paymentsCuit: container.querySelector('#payments-cuit'),
    saveBtn: container.querySelector('#settings-save'),
    readonlyHint: container.querySelector('#settings-readonly-hint'),
  };
}

function updatePaymentsFieldsState(refs) {
  const enabled = Boolean(refs?.paymentsEnabled?.checked);
  const controls = [refs?.paymentsBankName, refs?.paymentsCbu, refs?.paymentsAlias, refs?.paymentsCuit];

  controls.forEach((control) => {
    if (!control) return;
    control.disabled = !enabled || !canWrite('settings');
  });
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
    const rawPath = remapSocialLinkFieldPath(normalizePath(fieldError?.path));
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
  closedText.textContent = 'Cerrado';

  closedLabel.append(closedToggle, closedText);

  const openField = document.createElement('label');
  openField.className = 'settings__field';

  const openLabel = document.createElement('span');
  openLabel.className = 'settings__label';
  openLabel.textContent = 'Apertura';

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
  closeLabel.textContent = 'Cierre';

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

  if (refs?.addSocialLinkBtn) {
    refs.addSocialLinkBtn.disabled = !writable;
  }

  const removeButtons = refs?.socialLinksList?.querySelectorAll('[data-action="remove-social"]') || [];
  removeButtons.forEach((button) => {
    button.disabled = !writable;
  });

  updatePaymentsFieldsState(refs);
}

function remapSocialLinkFieldPath(path) {
  const normalized = normalizePath(path);
  const match = normalized.match(/^socialLinks\.(\d+)(\..+)?$/);
  if (!match) return normalized;

  const payloadIndex = Number.parseInt(match[1], 10);
  const suffix = match[2] || '';
  const domIndex = state.socialLinksIndexMap[payloadIndex];

  if (!Number.isInteger(domIndex)) return normalized;
  return `socialLinks.${domIndex}${suffix}`;
}

function createSocialRow(link, index) {
  const row = document.createElement('div');
  row.className = 'settings__social-row';
  row.dataset.index = String(index);

  const labelField = document.createElement('label');
  labelField.className = 'settings__field';

  const labelText = document.createElement('span');
  labelText.className = 'settings__label';
  labelText.textContent = 'Nombre';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'input';
  labelInput.name = `socialLinks.${index}.label`;
  labelInput.value = String(link?.label || '');

  labelField.append(labelText, labelInput);

  const urlField = document.createElement('label');
  urlField.className = 'settings__field';

  const urlText = document.createElement('span');
  urlText.className = 'settings__label';
  urlText.textContent = 'URL';

  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.className = 'input';
  urlInput.name = `socialLinks.${index}.url`;
  urlInput.placeholder = 'https://';
  urlInput.value = String(link?.url || '');

  urlField.append(urlText, urlInput);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn--ghost btn--sm';
  removeBtn.textContent = 'Quitar';
  removeBtn.dataset.action = 'remove-social';
  removeBtn.dataset.index = String(index);
  removeBtn.dataset.rbacAction = 'write';
  removeBtn.dataset.rbacHide = '';
  removeBtn.hidden = true;

  const labelError = document.createElement('p');
  labelError.className = 'settings__field-error';
  labelError.dataset.errorFor = `socialLinks.${index}.label`;
  labelError.hidden = true;

  const urlError = document.createElement('p');
  urlError.className = 'settings__field-error';
  urlError.dataset.errorFor = `socialLinks.${index}.url`;
  urlError.hidden = true;

  row.append(labelField, urlField, removeBtn, labelError, urlError);
  return row;
}

function renderSocialRows(refs) {
  if (!refs?.socialLinksList) return;

  refs.socialLinksList.textContent = '';
  state.socialLinksTemplate.forEach((link, index) => {
    refs.socialLinksList.append(createSocialRow(link, index));
  });

  applyRBAC(refs.socialLinksList);
}

function ensureSocialRows(refs, socialLinks) {
  const source = Array.isArray(socialLinks) ? socialLinks : [];

  state.socialLinksTemplate = source.map((item) => ({
    label: typeof item?.label === 'string' ? item.label : '',
    url: typeof item?.url === 'string' ? item.url : '',
  }));

  renderSocialRows(refs);
}

function addSocialRow(refs) {
  if (!canWrite('settings')) return;
  state.socialLinksTemplate.push({ label: '', url: '' });
  renderSocialRows(refs);
  setReadOnlyState(refs);
}

function removeSocialRow(refs, index) {
  if (!canWrite('settings')) return;
  if (!Number.isInteger(index) || index < 0 || index >= state.socialLinksTemplate.length) return;
  state.socialLinksTemplate.splice(index, 1);
  renderSocialRows(refs);
  setReadOnlyState(refs);
}

function prefillForm(refs, config) {
  const identity = config?.identity || {};
  const whatsapp = config?.whatsapp || {};
  const map = config?.map || {};
  const hours = config?.hours || {};
  const payments = config?.payments || {};

  if (refs.identityPhone) refs.identityPhone.value = String(identity.phone || '');
  if (refs.identityEmail) refs.identityEmail.value = String(identity.email || '');
  if (refs.identityAddress) refs.identityAddress.value = String(identity.address || '');
  if (refs.whatsappNumber) refs.whatsappNumber.value = String(whatsapp.number || '');
  if (refs.whatsappMessage) refs.whatsappMessage.value = String(whatsapp.message || '');
  if (refs.mapEmbedSrc) refs.mapEmbedSrc.value = String(map.embedSrc || '');
  if (refs.paymentsEnabled) refs.paymentsEnabled.checked = Boolean(payments.enabled);
  if (refs.paymentsBankName) refs.paymentsBankName.value = String(payments.bankName || '');
  if (refs.paymentsCbu) refs.paymentsCbu.value = formatCbuMask(payments.cbu);
  if (refs.paymentsAlias) refs.paymentsAlias.value = String(payments.alias || '');
  if (refs.paymentsCuit) refs.paymentsCuit.value = normalizeDigits(payments.cuit);
  ensureSocialRows(refs, config?.socialLinks);

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

  updateAlertMessageWarning(refs);
  updatePaymentsFieldsState(refs);

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

function collectSocialLinksPayload(refs) {
  const rowsDraft = state.socialLinksTemplate.map((_, index) => {
      const labelInput = refs.form?.elements?.namedItem(`socialLinks.${index}.label`);
      const urlInput = refs.form?.elements?.namedItem(`socialLinks.${index}.url`);

      return {
        domIndex: index,
        label: String(labelInput?.value || '').trim(),
        url: String(urlInput?.value || '').trim(),
      };
    });

  const payloadLinks = [];
  const indexMap = [];

  rowsDraft.forEach((link) => {
    if (!link.label && !link.url) return;
    indexMap.push(link.domIndex);
    payloadLinks.push({ label: link.label, url: link.url });
  });

  state.socialLinksIndexMap = indexMap;

  return {
    rowsDraft,
    payloadLinks,
    indexMap,
  };
}

function collectIdentityPayload(refs) {
  const rawMapEmbed = String(refs.mapEmbedSrc?.value || '');
  const extractedEmbedSrc = extractEmbedSrc(rawMapEmbed);

  const socialLinksDraft = collectSocialLinksPayload(refs);

  return {
    identity: {
      phone: normalizeDigits(refs.identityPhone?.value),
      email: String(refs.identityEmail?.value || '').trim(),
      address: String(refs.identityAddress?.value || '').trim(),
    },
    whatsapp: {
      number: normalizeDigits(refs.whatsappNumber?.value),
      message: String(refs.whatsappMessage?.value || '').trim(),
    },
    socialLinks: socialLinksDraft.payloadLinks,
    socialLinksDraft,
    map: {
      embedSrc: extractedEmbedSrc,
    },
    __rawMapEmbed: rawMapEmbed,
  };
}

function collectPaymentsPayload(refs) {
  return {
    enabled: Boolean(refs.paymentsEnabled?.checked),
    bankName: String(refs.paymentsBankName?.value || '').trim(),
    cbu: normalizeDigits(refs.paymentsCbu?.value),
    alias: String(refs.paymentsAlias?.value || '').trim(),
    cuit: normalizeDigits(refs.paymentsCuit?.value),
  };
}

function updateAlertMessageWarning(refs) {
  if (!refs?.alertMessageWarning) return;

  const alertEnabled = Boolean(refs.alertEnabled?.checked);
  const alertMessage = String(refs.alertMessage?.value || '').trim();
  refs.alertMessageWarning.hidden = !(alertEnabled && !alertMessage);
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
  return fieldErrors;
}

function validateIdentityContact(payload) {
  const fieldErrors = new Map();

  if (payload.identity.email && !EMAIL_REGEX.test(payload.identity.email)) {
    fieldErrors.set('identity.email', 'Ingresá un email válido.');
  }

  payload.socialLinksDraft.rowsDraft.forEach((link) => {
    if (!link.label && !link.url) return;

    if (!link.label) {
      fieldErrors.set(`socialLinks.${link.domIndex}.label`, 'Ingresá un nombre para la red social.');
    }
    if (!isValidHttpUrl(link.url)) {
      fieldErrors.set(`socialLinks.${link.domIndex}.url`, 'La URL debe comenzar con http:// o https://');
    }
  });

  if (payload.__rawMapEmbed.trim() && !payload.map.embedSrc) {
    fieldErrors.set('map.embedSrc', 'Pegá un src válido de Google Maps (o iframe con src).');
  } else if (payload.map.embedSrc && !isValidHttpUrl(payload.map.embedSrc)) {
    fieldErrors.set('map.embedSrc', 'El embed src debe comenzar con http:// o https://');
  }

  return fieldErrors;
}

function validatePayments(payload) {
  const fieldErrors = new Map();
  if (!payload.enabled) return fieldErrors;

  if (payload.cbu.length !== CBU_LENGTH) {
    fieldErrors.set('payments.cbu', 'El CBU debe tener 22 dígitos.');
  }

  return fieldErrors;
}

function mergeSettingsPayload(payload) {
  return {
    ...(state.siteConfig || {}),
    ...payload,
  };
}

async function saveSettings(refs) {
  if (state.isSaving || !refs?.form) return;

  clearFieldErrors(refs);
  setFormError(refs, '');

  const hoursPayload = collectHoursPayload(refs);
  const identityPayload = collectIdentityPayload(refs);
  const paymentsPayload = collectPaymentsPayload(refs);
  updateAlertMessageWarning(refs);
  const validationErrors = new Map([
    ...validateIdentityContact(identityPayload),
    ...validateHours(hoursPayload),
    ...validatePayments(paymentsPayload),
  ]);

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
    delete identityPayload.__rawMapEmbed;
    delete identityPayload.socialLinksDraft;
    const response = await apiFetch('/settings', {
      method: 'PUT',
      body: mergeSettingsPayload({
        ...identityPayload,
        payments: paymentsPayload,
        hours: hoursPayload,
      }),
      showErrorToast: false,
      redirectOn401: false,
    });

    state.siteConfig = response?.data || mergeSettingsPayload({
      ...identityPayload,
      payments: paymentsPayload,
      hours: hoursPayload,
    });
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

  refs.alertEnabled?.addEventListener('change', () => {
    updateAlertMessageWarning(refs);
  });

  refs.alertMessage?.addEventListener('input', () => {
    updateAlertMessageWarning(refs);
  });

  refs.addSocialLinkBtn?.addEventListener('click', () => {
    addSocialRow(refs);
  });

  refs.socialLinksList?.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-action="remove-social"]') : null;
    if (!trigger) return;

    const index = Number.parseInt(trigger.getAttribute('data-index') || '', 10);
    removeSocialRow(refs, index);
  });

  refs.whatsappNumber?.addEventListener('blur', () => {
    refs.whatsappNumber.value = normalizeDigits(refs.whatsappNumber?.value);
  });

  refs.identityPhone?.addEventListener('blur', () => {
    refs.identityPhone.value = normalizeDigits(refs.identityPhone?.value);
  });

  refs.mapEmbedSrc?.addEventListener('blur', () => {
    refs.mapEmbedSrc.value = extractEmbedSrc(refs.mapEmbedSrc?.value);
  });

  refs.paymentsEnabled?.addEventListener('change', () => {
    updatePaymentsFieldsState(refs);
  });

  refs.paymentsCbu?.addEventListener('input', () => {
    refs.paymentsCbu.value = formatCbuMask(refs.paymentsCbu?.value);
  });

  refs.paymentsCuit?.addEventListener('blur', () => {
    refs.paymentsCuit.value = normalizeDigits(refs.paymentsCuit?.value);
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
