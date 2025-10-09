/* =========================================================
   LOGIN MODULE SCRIPT — Refactor (sin cambiar UX)
   Mejoras aplicadas:
   - Redirección si ya hay sesión activa (UX)
   - Estado de envío: deshabilita submit y evita doble submit
   - Limpieza segura del password y foco en error
   - Snackbar con códigos alineados a backend (errors.js)
   - Toggle de contraseña accesible (aria-pressed/label/icon)
========================================================= */

import { login as doLogin, isAuthenticated } from '@/utils/auth.js';
import { showSnackbar } from '@/utils/snackbar.js';

/** Mapa de códigos → mensajes de UI (alineado a backend errors.js) */
const AUTH_ERROR_MESSAGES = {
  AUTH_INVALID: 'Credenciales inválidas.',
  AUTH_REQUIRED: 'Tu sesión expiró. Iniciá sesión nuevamente.',
  RATE_LIMITED: 'Demasiados intentos. Probá en unos minutos.',
  ACCOUNT_LOCKED: 'Cuenta bloqueada temporalmente.',
  INTERNAL_ERROR: 'Error interno. Probá más tarde.',
};

/** Obtiene mensaje de error amigable a partir de code/message */
function getAuthErrorMessage(err) {
  const code = (err && err.code) ? String(err.code) : '';
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  // Fallbacks razonables
  if (err && typeof err.message === 'string' && err.message.trim()) return err.message;
  return 'No se pudo iniciar sesión.';
}

/** Toggler accesible para el campo password */
function attachPasswordToggle(passwordInput, toggleBtn) {
  if (!passwordInput || !toggleBtn) return;

  const applyState = (visible) => {
    passwordInput.type = visible ? 'text' : 'password';
    toggleBtn.setAttribute('aria-pressed', String(visible));
    toggleBtn.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    toggleBtn.title = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    toggleBtn.innerHTML = visible
      ? '<span aria-hidden="true">🙈</span><span class="sr-only">Ocultar contraseña</span>'
      : '<span aria-hidden="true">👁</span><span class="sr-only">Mostrar contraseña</span>';
  };

  const toggle = () => applyState(passwordInput.type === 'password');
  toggleBtn.addEventListener('click', toggle);
  toggleBtn.addEventListener('keydown', (e) => {
    const isEnter = e.key === 'Enter';
    const isSpace = e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar';
    if (isEnter || isSpace) { e.preventDefault(); toggle(); }
  });
}

/** Helpers de UI (inline error) */
function showInlineError(message, el) {
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}
function clearInlineError(el) {
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

/** Deshabilita/rehabilita el botón submit y devuelve función restore */
function setSubmitting(submitBtn, isSubmitting) {
  if (!submitBtn) return () => {};
  const prevText = submitBtn.dataset.prevText || submitBtn.textContent;
  if (isSubmitting) {
    submitBtn.dataset.prevText = prevText;
    submitBtn.textContent = 'Verificando…';
    submitBtn.disabled = true;
  } else {
    submitBtn.textContent = prevText;
    submitBtn.disabled = false;
  }
  return () => setSubmitting(submitBtn, false);
}

/** Punto de entrada invocado por el router */
export function initLogin() {
  // 1) Redirección si ya existe sesión (mejora UX)
  if (isAuthenticated && isAuthenticated()) {
    window.location.hash = '#dashboard';
    return;
  }

  const form = document.querySelector('.login__form');
  const emailInput = document.querySelector('#email');
  const passwordInput = document.querySelector('#password');
  const errorMsg = document.querySelector('#login-error');
  const toggleBtn = document.querySelector('#password-toggle');
  const submitBtn = document.querySelector('#login-submit');

  if (!form) return;

  // Toggle de contraseña accesible
  attachPasswordToggle(passwordInput, toggleBtn);

  // 2) Submit
  let submitting = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return; // evita doble submit

    const email = (emailInput?.value ?? '').trim();
    const password = (passwordInput?.value ?? '').trim();

    // Validación mínima (cliente)
    const missing = [];
    if (!email) missing.push('email');
    if (!password) missing.push('contraseña');

    if (missing.length) {
      const message = `Por favor, complete ${missing.join(' y ')}.`;
      showInlineError(message, errorMsg);
      showSnackbar(message, { type: 'error', code: 'VALIDATION_ERROR' });
      if (passwordInput) passwordInput.focus();
      return;
    }

    // Estado de envío
    submitting = true;
    const restore = setSubmitting(submitBtn, true);
    clearInlineError(errorMsg);
    showSnackbar('Verificando…', { type: 'info' });

    try {
      await doLogin(email, password); // → guarda token + effectivePermissions
      showSnackbar('¡Bienvenido!', { type: 'success' });
      window.location.hash = '#dashboard';
    } catch (err) {
      // Mapear código → mensaje, limpiar password y enfocar
      const msg = getAuthErrorMessage(err);
      showInlineError(msg, errorMsg);
      showSnackbar(msg, { type: 'error', code: err?.code || 'AUTH_INVALID' });

      if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
      }
    } finally {
      submitting = false;
      restore();
    }
  });
}
