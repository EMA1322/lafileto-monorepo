// Servicio ligero para construir modales puntuales desde cualquier módulo.
// - Usa la hoja de estilos global (.modal / .modal__panel).
// - Devuelve un manejador con close() y limpia eventos al cerrarse.

let activeModal = null;
let escapeHandler = null;
let lastFocusedElement = null;

// Cierra el modal actual restaurando focus y limpiando listeners.
function closeActiveModal() {
  if (!activeModal) return;
  const { overlay, panel } = activeModal;
  overlay.remove();
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  if (panel) {
    panel.removeAttribute('aria-labelledby');
  }
  activeModal = null;
  lastFocusedElement = null;
}

// Construye el botón superior derecho para cerrar.
function buildCloseButton(onClose) {
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'btn btn--ghost btn--sm modal__close';
  closeButton.setAttribute('aria-label', 'Cerrar modal');
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', onClose);
  return closeButton;
}

// Devuelve clase de botón según la variante pedida.
function resolveVariant(variant = 'secondary') {
  const map = {
    primary: 'btn btn--primary',
    secondary: 'btn btn--secondary',
    danger: 'btn btn--danger',
    ghost: 'btn btn--ghost',
  };
  return map[variant] || map.secondary;
}

// Inyecta acciones en el panel con callbacks personalizados.
function attachActions(panel, actions, close) {
  if (!Array.isArray(actions) || actions.length === 0) return;
  const footer = document.createElement('div');
  footer.className = 'modal__actions';

  actions.forEach((action) => {
    const {
      label,
      variant = 'secondary',
      onClick,
      dismiss = true,
      type = 'button',
    } = action || {};
    if (!label) return;

    const button = document.createElement('button');
    button.type = type;
    button.className = resolveVariant(variant);
    button.textContent = String(label);
    button.addEventListener('click', (event) => {
      if (typeof onClick === 'function') {
        onClick(event, { close });
      }
      if (dismiss !== false) {
        close();
      }
    });
    footer.appendChild(button);
  });

  if (footer.childElementCount > 0) {
    panel.appendChild(footer);
  }
}

// Determina el nodo de contenido que se debe montar.
function resolveContent(content) {
  if (content instanceof HTMLElement) return content;
  if (typeof content === 'function') {
    const result = content();
    return result instanceof HTMLElement ? result : document.createTextNode(String(result ?? ''));
  }
  if (content == null) return document.createTextNode('');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = String(content);
  return wrapper;
}

/**
 * Abre un modal flotante.
 * @param {{ title?: string, content?: string|HTMLElement|(() => Node|string), actions?: Array }} config
 * @returns {{ close: () => void }} handler público.
 */
export function openModal(config = {}) {
  if (typeof document === 'undefined') {
    return { close: () => {} };
  }

  closeActiveModal();

  const { title = '', content = '', actions = [] } = config;
  const overlay = document.createElement('div');
  overlay.className = 'modal';

  const panel = document.createElement('div');
  panel.className = 'modal__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.tabIndex = -1;

  const close = () => closeActiveModal();

  const onOverlayClick = (event) => {
    if (event.target === overlay) {
      close();
    }
  };
  overlay.addEventListener('click', onOverlayClick);

  const closeButton = buildCloseButton(close);
  panel.appendChild(closeButton);

  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'modal__title';
    heading.textContent = String(title);
    const headingId = `modal-title-${Date.now()}`;
    heading.id = headingId;
    panel.setAttribute('aria-labelledby', headingId);
    panel.appendChild(heading);
  }

  const body = document.createElement('div');
  body.className = 'modal__body';
  const resolvedContent = resolveContent(content);
  body.appendChild(resolvedContent);
  panel.appendChild(body);

  attachActions(panel, actions, close);

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  escapeHandler = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  document.addEventListener('keydown', escapeHandler);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  queueMicrotask(() => {
    const firstFocusable = panel.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const target = (firstFocusable instanceof HTMLElement ? firstFocusable : panel);
    target.focus();
  });

  activeModal = { overlay, panel };

  return {
    close,
  };
}
