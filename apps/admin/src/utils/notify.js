// notify.js — fachada unificada para notificaciones.
// Comentarios en español, código en inglés.

import { toast } from './toast.js';

function normalizeType(type) {
  if (typeof type !== 'string') return 'info';
  const normalized = type.toLowerCase();
  if (normalized === 'success' || normalized === 'error' || normalized === 'info' || normalized === 'warning') {
    return normalized;
  }
  return 'info';
}

function resolveCall(args) {
  const [first, second, third] = args;

  // Firma principal: notify(type, message, options?)
  if (typeof first === 'string' && typeof second === 'string') {
    const firstNormalized = first.toLowerCase();
    if (firstNormalized === 'success' || firstNormalized === 'error' || firstNormalized === 'info' || firstNormalized === 'warning') {
      return { type: firstNormalized, message: second, options: third || {} };
    }
  }

  // Firmas legacy:
  // notify(message)
  // notify(message, { type, ...options })
  // notify(message, type, duration?)
  const message = first;

  if (typeof second === 'object' && second !== null) {
    const { type, ...options } = second;
    return {
      type: normalizeType(type),
      message,
      options: { ...options, ...((typeof third === 'object' && third) || {}) },
    };
  }

  if (typeof second === 'string') {
    const options = typeof third === 'number' ? { duration: third } : (third || {});
    return { type: normalizeType(second), message, options };
  }

  if (typeof second === 'number') {
    return { type: 'info', message, options: { duration: second } };
  }

  return { type: 'info', message, options: (typeof third === 'object' && third) || {} };
}

export function notify(...args) {
  const { type, message, options } = resolveCall(args);
  return toast[type](message, options);
}

export const showSnackbar = (...args) => notify(...args);

export default notify;
