// Utilidades genéricas para tablas en el panel.
// Comentarios en español, código en inglés.

function defaultAccessor(key) {
  return (item) => item?.[key];
}

function compareValues(a, b) {
  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA === 'number' && typeB === 'number') {
    return a - b;
  }
  const textA = String(a ?? '').toLocaleLowerCase('es');
  const textB = String(b ?? '').toLocaleLowerCase('es');
  return textA.localeCompare(textB, 'es', { sensitivity: 'base' });
}

export function sortBy(items, key, direction = 'asc', accessor = defaultAccessor(key)) {
  if (!Array.isArray(items)) return [];
  const dir = direction === 'desc' ? -1 : 1;
  return [...items].sort((left, right) => compareValues(accessor(left, key), accessor(right, key)) * dir);
}

export function paginate(items, page = 1, pageSize = 10) {
  const safePage = Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1);
  const safeSize = Math.max(1, Number.isFinite(pageSize) ? Math.trunc(pageSize) : 10);
  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safeSize;
  const slice = Array.isArray(items) ? items.slice(start, start + safeSize) : [];
  return {
    items: slice,
    totalItems,
    totalPages,
    page: currentPage,
    pageSize: safeSize,
  };
}

export function buildTableCell(content, { header = false, align = 'start', attributes = {} } = {}) {
  const tag = header ? 'th' : 'td';
  const attr = { ...attributes };
  if (align && align !== 'start') {
    attr['data-align'] = align;
  }
  const attrs = Object.entries(attr)
    .filter(([key, value]) => value != null && value !== false)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ');
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  return `${open}${content ?? ''}</${tag}>`;
}

export function buildTableRow(cells, { attributes = {} } = {}) {
  const attrs = Object.entries(attributes)
    .filter(([key, value]) => value != null && value !== false)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ');
  const open = attrs ? `<tr ${attrs}>` : '<tr>';
  return `${open}${Array.isArray(cells) ? cells.join('') : ''}</tr>`;
}

export function renderRows(items, renderItem) {
  if (!Array.isArray(items) || typeof renderItem !== 'function') return '';
  return items.map((item, index) => renderItem(item, index)).join('');
}
