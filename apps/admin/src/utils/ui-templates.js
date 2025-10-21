/**
 * Templates de UI usados en Admin.
 */
export function createButtonTemplate({
  label,
  variant = 'primary',
  size = 'md',
  attributes = {},
} = {}) {
  const attrs = Object.entries(attributes)
    .map(([k, v]) => (v === true ? k : `${k}="${String(v)}"`))
    .join(' ');
  return `<button type="button" class="btn btn-${variant} btn-${size}" ${attrs}>${label}</button>`;
}
