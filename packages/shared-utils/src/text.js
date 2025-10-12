/** Normaliza texto: minúsculas y sin acentos (útil para búsquedas) */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
