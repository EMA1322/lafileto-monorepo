// =========================================================
// Admin / Products — Refactor listo para backend (json|api)
// Comentarios en español; código en inglés.
// - Code-splitting del CSS (se carga en products.html)
// - Orden permitido: name | price | status (sin createdAt)
// - RBAC UI por data-requires (write/update/delete)
// - Envelope estándar y mapping de error codes a snackbar
// =========================================================

import { apiFetch, getDataSource } from '@/utils/api.js';
import { showSnackbar } from '@/utils/snackbar.js';
import { canWrite, canUpdate, canDelete } from '@/utils/rbac.js';
import { openModal, closeModal } from '@/utils/modals.js';

const moduleKey = 'products';
const DATA_SOURCE = getDataSource(); // 'json' | 'api'

// -----------------------------
// Estado de filtros/listado
// -----------------------------
const state = {
  q: '',
  categoryId: 'all',
  status: 'all',     // 'all' | 'active' | 'inactive'
  sortBy: 'name',    // 'name' | 'price' | 'status'
  sortDir: 'asc',    // 'asc' | 'desc'
  page: 1,
  pageSize: 10
};

// -----------------------------
// Refs y caches
// -----------------------------
let $tbody, $empty, $meta, $pageInfo;
let bound = false;
let categoriesCache = [];  // [{id,name,status}]
const PLACEHOLDER_IMG = '/img/placeholder_product.png';

// -----------------------------
// Utils DOM
// -----------------------------
const qs = (id) => document.getElementById(id);
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtMoney = (v) => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits: 0 }).format(Number(v||0));
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const escapeAttr = (s) => escapeHtml(s);

// -----------------------------
// RBAC (oculta acciones sin permiso)
// -----------------------------
function applyRbacVisibility(container) {
  if (!container) return;
  container.querySelectorAll('[data-requires]').forEach(el => {
    const need = String(el.getAttribute('data-requires') || '').toLowerCase();
    let ok = true;
    if (need === 'write')  ok = canWrite(moduleKey);
    if (need === 'update') ok = canUpdate(moduleKey);
    if (need === 'delete') ok = canDelete(moduleKey);
    if (!ok) el.hidden = true;
  });
}

// -----------------------------
// Data layer
// -----------------------------
async function loadCategories() {
  if (DATA_SOURCE === 'api') {
    const res = await apiFetch('/admin/categories', {
      method: 'GET',
      params: { status: 'active', orderBy: 'name', orderDir: 'asc', page: 1, pageSize: 1000 },
      showErrorToast: false
    });
    if (!res?.ok) throw res?.error || { code:'INTERNAL_ERROR', message:'No se pudieron cargar categorías' };
    return Array.isArray(res.data) ? res.data.map(c => ({ id: c.id, name: c.name, status: c.status })) : [];
  }
  // JSON
  const r = await fetch('/data/categories.json?ts=' + Date.now(), { cache: 'no-store' });
  const data = await r.json();
  return Array.isArray(data) ? data.map(c => ({ id: c.id, name: c.name, status: c.status })) : [];
}

async function loadProducts() {
  if (DATA_SOURCE === 'api') {
    const params = {
      q: state.q || undefined,
      categoryId: state.categoryId !== 'all' ? state.categoryId : undefined,
      status: state.status !== 'all' ? state.status : undefined,
      sortBy: state.sortBy,
      sortDir: state.sortDir,
      page: state.page,
      pageSize: state.pageSize
    };
    const res = await apiFetch('/admin/products', { method: 'GET', params, showErrorToast: false });
    if (!res?.ok) throw res?.error || { code:'INTERNAL_ERROR', message:'Error al listar productos' };
    return { rows: res.data || [], meta: res.meta || { page: state.page, pageSize: state.pageSize, total: (res.data||[]).length } };
  }

  // JSON mock — se filtra/ordena/pagina en cliente
  const r = await fetch('/data/products.json?ts=' + Date.now(), { cache: 'no-store' });
  let items = await r.json();

  // Filtros
  if (state.q) {
    const q = state.q.toLowerCase();
    items = items.filter(x => String(x.name||'').toLowerCase().includes(q));
  }
  if (state.categoryId !== 'all') {
    items = items.filter(x => String(x.categoryId) === String(state.categoryId));
  }
  if (state.status !== 'all') {
    items = items.filter(x => x.status === state.status);
  }

  // Orden (sin createdAt)
  items.sort((a,b) => compareProducts(a,b,state.sortBy,state.sortDir));

  // Paginación
  const total = items.length;
  const start = (state.page - 1) * state.pageSize;
  const rows  = items.slice(start, start + state.pageSize);

  return { rows, meta: { page: state.page, pageSize: state.pageSize, total, sortBy: state.sortBy, sortDir: state.sortDir } };
}

function compareProducts(a, b, by, dir) {
  let res = 0;
  switch (by) {
    case 'price':
      res = Number(a.price) - Number(b.price);
      break;
    case 'status': {
      const va = a.status === 'active' ? 0 : 1;
      const vb = b.status === 'active' ? 0 : 1;
      res = va - vb; // activos primero (asc)
      break;
    }
    case 'name':
    default:
      res = String(a.name||'').localeCompare(String(b.name||''), 'es', { sensitivity:'base' });
  }
  return dir === 'asc' ? res : -res;
}

// -----------------------------
// Render
// -----------------------------
function renderCategoryOptions() {
  const $sel = qs('prd-cat');
  const current = $sel.value || 'all';
  $sel.innerHTML = `<option value="all">Todas las categorías</option>` +
    categoriesCache
      .filter(c => c.status !== 'inactive') // mostrar activas
      .map(c => `<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)}</option>`)
      .join('');
  $sel.value = current;
}

function renderTable(rows, meta) {
  $tbody.innerHTML = rows.map(rowHTML).join('');
  const empty = rows.length === 0;
  $empty.hidden = !empty;

  const last = Math.max(1, Math.ceil((meta?.total||0) / state.pageSize));
  $pageInfo.textContent = `${state.page} / ${last}`;
  $meta.textContent = `${meta?.total||0} resultados`;
  qs('prd-prev').disabled = state.page <= 1;
  qs('prd-next').disabled = state.page >= last;

  // RBAC
  applyRbacVisibility(document);
}

function rowHTML(p) {
  const url = p.image || PLACEHOLDER_IMG;
  const catName = getCategoryName(p.categoryId);
  const price = fmtMoney(p.price);
  const statusClass = p.status === 'active' ? 'active' : 'inactive';
  return `
    <tr data-id="${escapeAttr(p.id)}">
      <td><img src="${escapeAttr(url)}" alt="" class="products__thumb" /></td>
      <td>${escapeHtml(p.name || '—')}</td>
      <td>${escapeHtml(catName || '—')}</td>
      <td>${price}</td>
      <td><span class="badge ${statusClass}">${p.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
      <td class="actions">
        <button class="btn btn--ghost" data-act="view"   data-id="${escapeAttr(p.id)}">Ver</button>
        <button class="btn btn--ghost" data-act="edit"   data-id="${escapeAttr(p.id)}" data-requires="update">Editar</button>
        <button class="btn btn--ghost" data-act="delete" data-id="${escapeAttr(p.id)}" data-requires="delete">Eliminar</button>
      </td>
    </tr>
  `;
}

function getCategoryName(id) {
  const c = categoriesCache.find(x => String(x.id) === String(id));
  return c ? c.name : '';
}

// -----------------------------
// CRUD (modales)
// -----------------------------
function openCreateModal() {
  openEditModal(null, {
    name: '',
    price: 0,
    categoryId: categoriesCache[0]?.id || '',
    isOffer: false,
    discount: 0,
    status: 'active',
    image: ''
  });
}

async function openEditModal(id, product) {
  const isEdit = Boolean(id);
  const title = isEdit ? 'Editar producto' : 'Nuevo producto';

  const categoryOptions = categoriesCache
    .filter(c => c.status !== 'inactive')
    .map(c => `<option value="${escapeAttr(c.id)}" ${String(c.id)===String(product.categoryId)?'selected':''}>${escapeHtml(c.name)}</option>`)
    .join('');

  const html = `
    <form id="prd-form" class="products__form">
      <header class="modal__header"><h3 class="modal__title">${title}</h3></header>

      <div class="products__field">
        <label class="products__label" for="prd-name">Nombre</label>
        <input id="prd-name" class="products__input" type="text" required value="${escapeAttr(product.name)}" />
      </div>

      <div class="products__field">
        <label class="products__label" for="prd-category">Categoría</label>
        <select id="prd-category" class="products__input">${categoryOptions}</select>
      </div>

      <div class="products__field">
        <label class="products__label" for="prd-price">Precio</label>
        <input id="prd-price" class="products__input" type="number" min="0" step="1" required value="${Number(product.price)||0}" />
      </div>

      <div class="products__grid">
        <label class="products__check">
          <input id="prd-offer" type="checkbox" ${product.isOffer?'checked':''}/> En oferta
        </label>
        <div class="products__field">
          <label class="products__label" for="prd-discount">Descuento (%)</label>
          <input id="prd-discount" class="products__input" type="number" min="0" max="95" step="1" value="${Number(product.discount)||0}" />
        </div>
        <div class="products__field">
          <label class="products__label" for="prd-status">Estado</label>
          <select id="prd-status" class="products__input">
            <option value="active" ${product.status==='active'?'selected':''}>Activo</option>
            <option value="inactive" ${product.status!=='active'?'selected':''}>Inactivo</option>
          </select>
        </div>
      </div>

      <div class="products__field">
        <label class="products__label" for="prd-image">URL de imagen</label>
        <input id="prd-image" class="products__input" type="url" placeholder="${PLACEHOLDER_IMG}" value="${escapeAttr(product.image || '')}" />
      </div>

      <footer class="modal__footer">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancelar</button>
        <button id="prd-save" type="submit" class="btn">${isEdit?'Guardar':'Crear'}</button>
      </footer>
    </form>
  `;

  openModal(html, '#prd-save');

  // Bind submit
  const $form = document.getElementById('prd-form');
  $form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('prd-name').value.trim(),
      categoryId: document.getElementById('prd-category').value,
      price: Number(document.getElementById('prd-price').value || 0),
      isOffer: document.getElementById('prd-offer').checked,
      discount: Number(document.getElementById('prd-discount').value || 0),
      status: document.getElementById('prd-status').value,
      image: document.getElementById('prd-image').value.trim()
    };

    // Validaciones mínimas
    if (!payload.name) { showSnackbar('Revisá los datos: hay campos inválidos.', { type:'error', code:'VALIDATION_ERROR' }); return; }
    if (!payload.categoryId) { showSnackbar('Seleccioná una categoría válida.', { type:'error', code:'VALIDATION_ERROR' }); return; }
    if (!(payload.price >= 0)) { showSnackbar('El precio debe ser un número válido.', { type:'error', code:'VALIDATION_ERROR' }); return; }
    if (payload.isOffer && (payload.discount < 0 || payload.discount > 95)) {
      showSnackbar('El descuento debe ser entre 0 y 95%.', { type:'error', code:'VALIDATION_ERROR' }); return;
    }

    try {
      if (DATA_SOURCE === 'api') {
        const url = isEdit ? `/admin/products/${encodeURIComponent(id)}` : '/admin/products';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await apiFetch(url, { method, body: payload, showErrorToast: false });
        if (!res?.ok) throw res?.error || { code:'INTERNAL_ERROR', message:'No se pudo guardar el producto' };
        showSnackbar(isEdit?'Producto actualizado':'Producto creado', { type:'success' });
      } else {
        showSnackbar('Demo JSON: cambios no persistidos', { type:'info' });
      }
      closeModal();
      await reload();
    } catch (err) {
      const code = err?.code || 'INTERNAL_ERROR';
      const msg =
        code === 'VALIDATION_ERROR' ? 'Revisá los datos: hay campos inválidos.' :
        code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID' ? 'Iniciá sesión / Tu sesión expiró.' :
        code === 'RATE_LIMITED' ? 'Demasiadas solicitudes. Probá en unos minutos.' :
        (err?.message || 'No se pudo guardar.');
      showSnackbar(msg, { type:'error', code });
    }
  });
}

function openViewModal(p) {
  const html = `
    <div class="products__view">
      <header class="modal__header"><h3 class="modal__title">${escapeHtml(p.name)}</h3></header>
      <div class="products__viewBody">
        <img src="${escapeAttr(p.image || PLACEHOLDER_IMG)}" alt="" class="products__viewImg"/>
        <dl class="products__viewInfo">
          <dt>Categoría</dt><dd>${escapeHtml(getCategoryName(p.categoryId) || '—')}</dd>
          <dt>Precio</dt><dd>${fmtMoney(p.price)}</dd>
          <dt>Estado</dt><dd>${p.status==='active'?'Activo':'Inactivo'}</dd>
          <dt>Oferta</dt><dd>${p.isOffer ? `${p.discount}%` : '—'}</dd>
        </dl>
      </div>
      <footer class="modal__footer">
        <button class="btn" data-close-modal>Cerrar</button>
      </footer>
    </div>
  `;
  openModal(html);
}

function openDeleteModal(id, name) {
  const html = `
    <div>
      <p>¿Eliminar el producto <strong>${escapeHtml(name)}</strong>?</p>
      <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem;">
        <button class="btn btn-secondary" data-close-modal>Cancelar</button>
        <button id="prd-confirm-delete" class="btn">Eliminar</button>
      </div>
    </div>
  `;
  openModal(html, '#prd-confirm-delete');

  const onConfirm = async () => {
    try {
      if (DATA_SOURCE === 'api') {
        const res = await apiFetch(`/admin/products/${encodeURIComponent(id)}`, {
          method:'DELETE',
          showErrorToast: false
        });
        if (!res?.ok) throw res?.error || { code:'INTERNAL_ERROR', message:'No se pudo eliminar' };
        showSnackbar('Producto eliminado', { type:'success' });
      } else {
        showSnackbar('Demo JSON: cambios no persistidos', { type:'info' });
      }
      closeModal();
      await reload();
    } catch (err) {
      const code = err?.code || 'INTERNAL_ERROR';
      const msg =
        code === 'RESOURCE_CONFLICT' ? 'Operación en conflicto. Revisá los datos.' :
        (err?.message || 'No se pudo eliminar.');
      showSnackbar(msg, { type:'error', code });
    } finally {
      document.getElementById('prd-confirm-delete')?.removeEventListener('click', onConfirm);
    }
  };

  document.getElementById('prd-confirm-delete')?.addEventListener('click', onConfirm);
}

// -----------------------------
// Eventos y recarga
// -----------------------------
function bindEventsOnce() {
  if (bound) return; bound = true;

  // Buscar (debounce)
  qs('prd-q').addEventListener('input', debounce((e) => {
    state.q = String(e.target.value || '').trim(); state.page = 1; reload();
  }, 300));

  // Filtros
  qs('prd-cat').addEventListener('change', (e) => { state.categoryId = e.target.value || 'all'; state.page = 1; reload(); });
  qs('prd-status').addEventListener('change', (e) => { state.status = e.target.value || 'all'; state.page = 1; reload(); });

  // Orden
  qs('prd-sort-by').addEventListener('change', (e) => { state.sortBy = e.target.value || 'name'; reload(); });
  qs('prd-sort-dir').addEventListener('change', (e) => { state.sortDir = e.target.value || 'asc'; reload(); });

  // Acciones generales
  qs('prd-refresh').addEventListener('click', () => reload());
  qs('prd-create').addEventListener('click', () => openCreateModal());

  // Pager
  qs('prd-prev').addEventListener('click', () => { if (state.page > 1) { state.page--; reload(); }});
  qs('prd-next').addEventListener('click', () => { state.page++; reload(); });

  // Delegación de acciones por fila
  $tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const id  = btn.getAttribute('data-id');
    if (act === 'view')   handleView(id);
    if (act === 'edit')   handleEdit(id);
    if (act === 'delete') handleDelete(id);
  });
}

async function reload() {
  try {
    const { rows, meta } = await loadProducts();
    renderTable(rows, meta);
  } catch (err) {
    const code = err?.code || 'INTERNAL_ERROR';
    const msg =
      code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID' ? 'Iniciá sesión / Tu sesión expiró.' :
      code === 'RATE_LIMITED' ? 'Demasiadas solicitudes. Probá en unos minutos.' :
      (err?.message || 'Error al cargar productos.');
    $tbody.innerHTML = '';
    $empty.hidden = false;
    showSnackbar(msg, { type:'error', code });
  }
}

// -----------------------------
// Handlers de fila
// -----------------------------
async function handleView(id) {
  const p = await findProductById(id);
  if (p) openViewModal(p);
}
async function handleEdit(id) {
  const p = await findProductById(id);
  if (p) openEditModal(id, p);
}
async function handleDelete(id) {
  const p = await findProductById(id);
  if (p) openDeleteModal(id, p.name);
}

async function findProductById(id) {
  // En JSON filtramos sobre la página actual; si hiciera falta, podríamos cachear
  const { rows } = await loadProducts(); // simple y consistente
  return rows.find(x => String(x.id) === String(id));
}

// -----------------------------
// API pública
// -----------------------------
export async function initProducts() {
  // Refs
  $tbody    = qs('prd-tbody');
  $empty    = qs('prd-empty');
  $meta     = qs('prd-meta');
  $pageInfo = qs('prd-page');

  // Cargar categorías para filtros/formularios
  try {
    categoriesCache = await loadCategories();
    renderCategoryOptions();
  } catch (err) {
    showSnackbar('No se pudieron cargar categorías', { type:'error', code: err?.code || 'INTERNAL_ERROR' });
  }

  bindEventsOnce();
  applyRbacVisibility(document); // oculta/inhabilita acciones según permisos
  await reload();
}
