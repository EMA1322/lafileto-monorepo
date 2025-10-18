export function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function mapErrorToMessage(err, fallback = 'Ocurrió un error.') {
  const code = err?.code || '';
  if (code === 'VALIDATION_ERROR') return 'Revisá los datos: hay campos inválidos.';
  if (code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID') return 'Iniciá sesión / Tu sesión expiró.';
  if (code === 'PERMISSION_DENIED') return 'No tenés permisos para esta acción.';
  if (code === 'RESOURCE_NOT_FOUND') return 'El recurso no existe o fue eliminado.';
  if (code === 'CONFLICT' || code === 'RESOURCE_CONFLICT') return 'Operación en conflicto. Revisá los datos.';
  if (code === 'ROLE_IN_USE') return 'No se puede eliminar: hay usuarios asignados a este rol.';
  if (code === 'SELF_DELETE_FORBIDDEN') return 'No podés eliminar tu propio usuario.';
  if (code === 'LAST_ADMIN_FORBIDDEN') return 'No se puede eliminar el último administrador.';
  if (code === 'RATE_LIMITED') return 'Demasiadas solicitudes. Probá en unos minutos.';
  return err?.message || fallback;
}

export function clearFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll('[data-error]').forEach((node) => {
    node.textContent = '';
    node.setAttribute('hidden', 'true');
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
    input.removeAttribute('aria-invalid');
  });
}

export function setFieldError(form, field, message) {
  if (!form || !field) return;
  const wrapper = form.querySelector(`[data-field="${field}"]`);
  const error = wrapper?.querySelector('[data-error]');
  const input = wrapper?.querySelector('input, select, textarea');
  if (!error) return;
  if (message) {
    error.textContent = message;
    error.removeAttribute('hidden');
    input?.setAttribute('aria-invalid', 'true');
  } else {
    error.textContent = '';
    error.setAttribute('hidden', 'true');
    input?.removeAttribute('aria-invalid');
  }
}

export function applyFieldErrors(form, errors = {}) {
  if (!form || typeof errors !== 'object' || !errors) return;
  Object.entries(errors).forEach(([field, message]) => {
    setFieldError(form, field, message);
  });
}
