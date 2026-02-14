import { apiFetch } from '../../utils/api.js';

const STATUS = {
  LOADING: 'loading',
  ERROR: 'error',
  EMPTY: 'empty',
  SUCCESS: 'success',
};

function getRefs() {
  const container = document.querySelector('#settings-module');
  if (!container) return null;

  const content = container.querySelector('.settings__content');
  return {
    container,
    content,
    errorMessage: container.querySelector('#settings-error-message'),
    jsonNode: container.querySelector('#settings-json'),
    retryBtn: container.querySelector('#settings-retry'),
    reloadBtn: container.querySelector('#settings-reload'),
    successCard: container.querySelector('#settings-success'),
    loadingState: container.querySelector('#settings-loading'),
    errorState: container.querySelector('#settings-error'),
    emptyState: container.querySelector('#settings-empty'),
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

function toPrettyJson(data) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return '{}';
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

async function loadSettings(refs) {
  setStatus(refs, STATUS.LOADING);

  try {
    const response = await apiFetch('/settings', {
      method: 'GET',
      showErrorToast: false,
      redirectOn401: false,
    });

    const payload = response?.data ?? null;
    if (isEmptySettings(payload)) {
      if (refs.jsonNode) refs.jsonNode.textContent = '{}';
      setStatus(refs, STATUS.EMPTY);
      return;
    }

    if (refs.jsonNode) refs.jsonNode.textContent = toPrettyJson(payload);
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

  void loadSettings(refs);
}

export default {
  initSettings,
};
