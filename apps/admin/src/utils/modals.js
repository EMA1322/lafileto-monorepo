/**
 * /admin/src/utils/modals.js
 *
 * Modal global con accesibilidad (A11y):
 * - Escape para cerrar
 * - Focus trap (Tab / Shift+Tab)
 * - Retorno de foco al disparador
 * - Blur del foco ANTES de aria-hidden (evita warning: "Blocked aria-hidden descendant retained focus")
 *
 * Convenciones:
 * - Nombres de funciones/variables/IDs en INGLÉS.
 * - Comentarios y textos de usuario en ESPAÑOL.
 *
 * Estructura esperada en index.html (actualizada):
 *  <div id="global-modal" class="modal hidden" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="modal-title">
 *    <div id="modal-overlay"></div>
 *    <div class="modal__content" tabindex="-1">
 *      <h2 id="modal-title" class="modal__title"></h2>
 *      <button id="modal-close" aria-label="Cerrar"></button>
 *      <div id="modal-body" class="modal__body"></div>
 *    </div>
 *  </div>
 */

import { createFocusTrap } from 'focus-trap';

let modalEl, modalBodyEl, modalCloseBtnEl, modalOverlayEl; // refs a nodos del DOM
let lastModalTriggerEl = null;    // elemento que disparó la apertura del modal
let keydownHandler = null;        // referencia al handler de teclado (para limpiar)
let bodyClickHandler = null;      // delega cierre por [data-close-modal]
let isInitialized = false;        // evita registrar listeners múltiples
let modalTrap = null;             // instancia focus-trap para modal global

/**
 * Inicializa referencias y listeners del modal global.
 * Idempotente: si se llama más de una vez, no duplica listeners.
 */
export function initModals() {
  // Obtener nodos según estructura de index.html
  modalEl         = document.getElementById('global-modal');
  modalBodyEl     = document.getElementById('modal-body');
  modalCloseBtnEl = document.getElementById('modal-close');
  modalOverlayEl  = document.getElementById('modal-overlay');

  if (!modalEl || !modalBodyEl || !modalCloseBtnEl || !modalOverlayEl) {
    console.error('[Modals] No se encontraron nodos requeridos. Verificá index.html');
    return;
  }
  if (isInitialized) return; // evitar doble enlace/HMR

  // Cierre al presionar Escape y trap de foco (se adjunta al abrir)
  keydownHandler = null;

  // Cierre al clickear el overlay
  modalOverlayEl.addEventListener('click', closeModal);

  // Delegación para botones dentro del contenido dinámico: data-close-modal
  bodyClickHandler = (e) => {
    if (e.target.closest('[data-close-modal]')) {
      e.preventDefault();
      closeModal();
    }
  };
  modalBodyEl.addEventListener('click', bodyClickHandler);

  // Exponer API global (compatibilidad con módulos legados)
  if (typeof window !== 'undefined') {
    window.openModal = openModal;
    window.closeModal = closeModal;
  }

  isInitialized = true;
}

/**
 * Abre el modal con contenido HTML proporcionado.
 * - content: HTML string o Node a montar en el cuerpo del modal.
 * - focusSelector: selector del elemento a enfocar inicialmente (opcional).
 */
export function openModal(content = '', focusSelector = '#modal-close') {
  if (!modalEl) initModals();
  if (!modalEl) return; // defensa si init falló

  // Guardar el elemento actualmente enfocado para restaurarlo al cerrar
  lastModalTriggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // Inyectar contenido
  if (content instanceof Node) {
    modalBodyEl.replaceChildren(content);
  } else {
    modalBodyEl.innerHTML = String(content ?? '');
  }

  // Mostrar modal y marcar atributos ARIA SOLO en el contenedor
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('role', 'dialog');

  // Configurar Escape (limpiar si ya existía)
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  keydownHandler = (e) => {
    // Escape cierra
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

  };
  document.addEventListener('keydown', keydownHandler);

  if (!modalTrap) {
    modalTrap = createFocusTrap(modalEl, {
      fallbackFocus: modalEl,
      allowOutsideClick: true,
      escapeDeactivates: false,
      clickOutsideDeactivates: false,
      returnFocusOnDeactivate: false,
    });
  }

  // Foco inicial: selector → primer focusable → botón cerrar → contenedor
  const initialFocus =
    (focusSelector && modalEl.querySelector(focusSelector)) ||
    getFocusableElements(modalEl)[0] ||
    modalCloseBtnEl ||
    modalEl;

  modalTrap.activate({ initialFocus });

  // Evitar que el foco se pierda si el elemento aún no existe
  queueMicrotask(() => {
    if (initialFocus && typeof initialFocus.focus === 'function') {
      initialFocus.focus();
    }
  });
}

/**
 * Cierra el modal, elimina handlers y RESTAURA el foco al disparador.
 * Incluye blur previo para evitar el warning ARIA de foco retenido.
 */
export function closeModal() {
  if (!modalEl) return;

  // Remover handler de teclado (si estaba activo)
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }

  if (modalTrap) {
    modalTrap.deactivate();
  }

  // Si el foco quedó dentro del modal, hacer blur ANTES de aria-hidden
  if (modalEl.contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  // Ocultar modal + atributos ARIA SOLO en el contenedor
  modalEl.classList.add('hidden');
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.removeAttribute('aria-modal');

  // Vaciar contenido dinámico
  modalBodyEl.innerHTML = '';

  // Restaurar foco al disparador de forma segura (microtask)
  queueMicrotask(() => {
    if (
      lastModalTriggerEl
      && document.contains(lastModalTriggerEl)
      && typeof lastModalTriggerEl.focus === 'function'
    ) {
      lastModalTriggerEl.focus();
    } else if (document.body && typeof document.body.focus === 'function') {
      document.body.focus();
    }
    lastModalTriggerEl = null;
  });
}


/* Utilidad: devuelve elementos focusables visibles dentro de un contenedor */
function getFocusableElements(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  // Filtra elementos no visibles (offsetParent === null) salvo el activo
  return Array.from(container.querySelectorAll(selectors))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}
