// api.js
// Comentarios en español; código en inglés.
// Reexporta desde auth.js para evitar duplicaciones o estados divergentes.

export {
  API_BASE,
  apiFetch,
  getToken,
  setToken,
  clearToken,
  isAuthenticated,
  login,
  logout
} from './auth.js';

/**
 * DATA_SOURCE (R-3):
 * Permite migrar módulo por módulo de /public/data/*.json → API real.
 * Prioridad: localStorage('DATA_SOURCE') > VITE_DATA_SOURCE > 'json'
 * Valores esperados: 'json' | 'api'
 */
export const DATA_SOURCE = (() => {
  const ls = (typeof localStorage !== 'undefined' && localStorage.getItem('DATA_SOURCE')) || '';
  const env = (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_DATA_SOURCE : '') || '';
  return (ls || env || 'json').toLowerCase() === 'api' ? 'api' : 'json';
})();

/** Getter simple para usar en módulos sin importar detalles de resolución. */
export function getDataSource() {
  return DATA_SOURCE;
}
