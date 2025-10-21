const LOADER_STYLE_ID = 'ui-loader-styles';
let loaderStylesInjected = false;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function ensureUiLoaderStyles() {
  if (loaderStylesInjected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById(LOADER_STYLE_ID)) {
    loaderStylesInjected = true;
    return;
  }

  const style = document.createElement('style');
  style.id = LOADER_STYLE_ID;
  style.textContent = `
    .ui-loader {
      display: grid;
      place-items: center;
      gap: .75rem;
      padding: 2rem;
      min-height: 180px;
      text-align: center;
    }
    .ui-loader__spinner {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid rgba(0,0,0,.15);
      border-top-color: rgba(0,0,0,.6);
      animation: ui-spin 1s linear infinite;
      display: inline-block;
    }
    .ui-loader__text {
      font-size: .95rem;
      color: #333;
    }
    @keyframes ui-spin {
      to { transform: rotate(360deg); }
    }
    .ui-empty {
      padding: 2rem;
      text-align: center;
      color: #555;
    }
    .ui-empty p {
      margin: 0;
      font-size: 1rem;
    }
  `;

  document.head.appendChild(style);
  loaderStylesInjected = true;
}

export function uiLoader(label = 'Cargando…') {
  const safeLabel = escapeHtml(label);
  return `
    <div class="ui-loader" aria-busy="true" aria-live="polite">
      <span class="ui-loader__spinner" aria-hidden="true"></span>
      <span class="ui-loader__text">${safeLabel}</span>
    </div>
  `;
}

export function uiNotFound(message = 'Sin resultados') {
  const safeMessage = escapeHtml(message);
  return `
    <div class="ui-empty" role="status" aria-live="polite">
      <p>${safeMessage}</p>
    </div>
  `;
}
