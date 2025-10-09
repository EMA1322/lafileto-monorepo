// Admin / Categories — Refactor listo para backend
// Comentarios en español; código en inglés.
// - Mantiene: búsqueda por nombre, filtro Todas/Activas/Inactivas, orden Asc/Desc (por name), +Nuevo
// - Tabla: Nombre | Estado | Productos | Acciones
// - Code-splitting del CSS (se carga en el HTML del módulo)
// - UI-RBAC por data-requires (write/update/delete)
// - DATA_SOURCE='json'|'api' (desde utils/api.js)

import { apiFetch, getDataSource } from '../../utils/api.js';
import { showSnackbar } from '../../utils/snackbar.js';
import { canWrite, canUpdate, canDelete } from '../../utils/rbac.js';
import { openModal, closeModal } from '../../utils/modals.js';

const moduleKey = 'categories';
const DATA_SOURCE = getDataSource();

// ---------- Estado del listado ----------
const state = {
  q: '',
  status: 'all',   // 'all' | 'active' | 'inactive'
  orderBy: 'name', // fijo por decisión
  orderDir: 'asc', // 'asc' | 'desc'
  page: 1,
  pageSize: 20
};

// ---------- Refs ----------
let $tbody, $empty, $meta, $pageInfo, $dialog, $form, $statusInput, $nameInput;
let bound = false;
let editingId = null;

// ---------- Utils DOM ----------
const qs = (id) => document.getElementById(id);
const debounce = (fn, ms = 300) => {
  let t = null; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

// ---------- RBAC en UI por data-requires ----------
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

// ---------- Carga de datos ----------
async function listCategories() {
  if (DATA_SOURCE === 'api') {
    // API real — envelope estándar
    const params = {
      q: state.q || undefined,
      status: state.status !== 'all' ? state.status : undefined,
      orderBy: state.orderBy,
      orderDir: state.orderDir,
      page: state.page,
      pageSize: state.pageSize,
      withCounts: 'true' // server: incluir productCount
    };
    const url = '/admin/categories';
    const res = await apiFetch(url, { method: 'GET', params });
    if (!res?.ok) throw res?.error || { message: 'Error al listar categorías', code: 'INTERNAL_ERROR' };
    return res;
  }

  // JSON mock — /public/data/categories.json
  const res = await fetch('/data/categories.json?ts=' + Date.now(), { cache: 'no-store' });
  const all = await res.json();

  // Filtrar por estado
  let items = all.filter(x => ['active', 'inactive'].includes(x.status));

  // Buscar por nombre
  if (state.q) {
    const q = state.q.toLowerCase();
    items = items.filter(x => String(x.name || '').toLowerCase().includes(q));
  }

  // Filtro de estado
  if (state.status === 'active')   items = items.filter(x => x.status === 'active');
  if (state.status === 'inactive') items = items.filter(x => x.status === 'inactive');

  // Orden por name
  items.sort((a, b) => {
    const A = String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' });
    return state.orderDir === 'asc' ? A : -A;
  });

  // Paginación simple
  const total = items.length;
  const start = (state.page - 1) * state.pageSize;
  const data  = items.slice(start, start + state.pageSize);

  // Enriquecer con productCount (si no viene)
  const dataWithCounts = data.map(x => ({ ...x, productCount: Number(x.productCount ?? 0) }));

  return {
    ok: true,
    data: dataWithCounts,
    meta: { page: state.page, pageSize: state.pageSize, total, orderBy: state.orderBy, orderDir: state.orderDir }
  };
}

// ---------- Render ----------
function renderTable(rows, meta) {
  if (!Array.isArray(rows)) rows = [];
  $tbody.innerHTML = rows.map(rowHTML).join('') || '';
  $empty.hidden = rows.length > 0;

  // Meta + pager
  const lastPage = Math.max(1, Math.ceil((meta?.total || 0) / state.pageSize));
  $pageInfo.textContent = `${state.page} / ${lastPage}`;
  $meta.textContent = `${meta?.total ?? 0} resultados`;
  qs('btn-prev').disabled = state.page <= 1;
  qs('btn-next').disabled = state.page >= lastPage;

  // Aplicar RBAC a botones de acción
  applyRbacVisibility($tbody);
  applyRbacVisibility(document); // +Nuevo
}

function rowHTML(item) {
  const id = item.id;
  const name = item.name || '—';
  const status = item.status === 'inactive' ? 'inactive' : 'active';
  const count = Number(item.productCount ?? 0);

  return `
    <tr data-id="${id}">
      <td>${escapeHtml(name)}</td>
      <td><span class="badge ${status}">${status === 'active' ? 'Activa' : 'Inactiva'}</span></td>
      <td>${Number.isFinite(count) ? count : '—'}</td>
      <td>
        <button class="btn btn--ghost" data-act="edit" data-id="${id}" data-name="${escapeAttr(name)}" data-status="${status}" data-requires="update">Editar</button>
        <button class="btn btn--ghost" data-act="delete" data-id="${id}" data-name="${escapeAttr(name)}" data-requires="delete">Eliminar</button>
      </td>
    </tr>
  `;
}

// ---------- Acciones CRUD ----------
function openCreate() {
  editingId = null;
  $form.reset();
  $nameInput.value = '';
  $statusInput.value = 'active';
  qs('cat-dialog-title').textContent = 'Nueva categoría';
  $dialog.showModal();
}

function openEditFromBtn(btn) {
  editingId = String(btn.getAttribute('data-id'));
  $form.reset();
  $nameInput.value = String(btn.getAttribute('data-name') || '');
  $statusInput.value = String(btn.getAttribute('data-status') || 'active');
  qs('cat-dialog-title').textContent = 'Editar categoría';
  $dialog.showModal();
}

async function onSave(ev) {
  ev.preventDefault();
  const payload = {
    name: ($nameInput.value || '').trim(),
    status: ($statusInput.value || 'active')
  };
  if (!payload.name) {
    showSnackbar('Revisá los datos: hay campos inválidos.', { type: 'error', code: 'VALIDATION_ERROR' });
    $nameInput.focus();
    return;
  }

  try {
    if (DATA_SOURCE === 'api') {
      if (editingId) {
        const res = await apiFetch(`/admin/categories/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          body: payload
        });
        if (!res?.ok) throw res?.error || { message: 'Error al actualizar', code: 'INTERNAL_ERROR' };
        showSnackbar('Categoría actualizada', { type: 'success' });
      } else {
        const res = await apiFetch('/admin/categories', { method: 'POST', body: payload });
        if (!res?.ok) throw res?.error || { message: 'Error al crear', code: 'INTERNAL_ERROR' };
        showSnackbar('Categoría creada', { type: 'success' });
      }
    } else {
      // Mock JSON: no se persiste; UX informativa
      showSnackbar('Demo JSON: cambios no persistidos', { type: 'info' });
    }
    $dialog.close();
    await reload(); // refrescar la lista
  } catch (err) {
    const code = err?.code || 'INTERNAL_ERROR';
    const msg =
      code === 'VALIDATION_ERROR' ? 'Revisá los datos: hay campos inválidos.' :
      code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID' ? 'Iniciá sesión / Tu sesión expiró.' :
      code === 'RATE_LIMITED' ? 'Demasiadas solicitudes. Probá en unos minutos.' :
      (err?.message || 'No se pudo guardar.');
    showSnackbar(msg, { type: 'error', code });
  }
}

function confirmDeleteFromBtn(btn) {
  const id = String(btn.getAttribute('data-id'));
  const name = String(btn.getAttribute('data-name') || '');
  const html = `
    <div>
      <p>¿Eliminar la categoría <strong>${escapeHtml(name)}</strong>?</p>
      <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem;">
        <button class="btn btn-secondary" data-close-modal>Cancelar</button>
        <button id="cat-confirm-delete" class="btn">Eliminar</button>
      </div>
    </div>
  `;
  openModal(html, '#cat-confirm-delete');
  const confirmBtn = document.getElementById('cat-confirm-delete');
  const onConfirm = async () => {
    try {
      if (DATA_SOURCE === 'api') {
        const res = await apiFetch(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res?.ok) throw res?.error || { message: 'No se pudo eliminar', code: 'INTERNAL_ERROR' };
        showSnackbar('Categoría eliminada', { type: 'success' });
      } else {
        showSnackbar('Demo JSON: cambios no persistidos', { type: 'info' });
      }
      closeModal();
      await reload();
    } catch (err) {
      const code = err?.code || 'INTERNAL_ERROR';
      const msg =
        code === 'CATEGORY_REASSIGN_REQUIRED' ? 'No podés eliminar: hay productos asociados.' :
        code === 'PERMISSION_DENIED' ? 'No tenés permisos para esta acción.' :
        (err?.message || 'No se pudo eliminar.');
      showSnackbar(msg, { type: 'error', code });
    } finally {
      confirmBtn?.removeEventListener('click', onConfirm);
    }
  };
  confirmBtn?.addEventListener('click', onConfirm);
}

// ---------- Carga/Recarga ----------
async function reload() {
  try {
    const res = await listCategories();
    renderTable(res.data || [], res.meta || {});
  } catch (err) {
    const code = err?.code || 'INTERNAL_ERROR';
    const msg =
      code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID' ? 'Iniciá sesión / Tu sesión expiró.' :
      code === 'RATE_LIMITED' ? 'Demasiadas solicitudes. Probá en unos minutos.' :
      (err?.message || 'Error al cargar categorías.');
    $tbody.innerHTML = '';
    $empty.hidden = false;
    showSnackbar(msg, { type: 'error', code });
  }
}

// ---------- Bindeo de eventos ----------
function bindEventsOnce() {
  if (bound) return; bound = true;

  // Buscar (debounce)
  const onSearch = debounce((e) => {
    state.q = String(e.target.value || '').trim();
    state.page = 1;
    reload();
  }, 300);
  qs('filter-q').addEventListener('input', onSearch);

  // Estado
  qs('filter-status').addEventListener('change', (e) => {
    state.status = String(e.target.value || 'all');
    state.page = 1;
    reload();
  });

  // Orden (por name)
  qs('filter-dir').addEventListener('change', (e) => {
    state.orderDir = String(e.target.value || 'asc');
    state.page = 1;
    reload();
  });

  // Refresh
  qs('btn-refresh').addEventListener('click', () => reload());

  // Nuevo
  const $btnCreate = qs('btn-create');
  $btnCreate.addEventListener('click', openCreate);

  // Pager
  qs('btn-prev').addEventListener('click', () => { if (state.page > 1) { state.page--; reload(); }});
  qs('btn-next').addEventListener('click', () => { state.page++; reload(); });

  // Delegación en la tabla
  $tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    if (act === 'edit')   openEditFromBtn(btn);
    if (act === 'delete') confirmDeleteFromBtn(btn);
  });

  // Dialog
  qs('cat-cancel').addEventListener('click', () => $dialog.close());
  $form.addEventListener('submit', onSave);
}

// ---------- Helpers ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// ---------- API pública ----------
export async function initCategories() {
  // Refs
  $tbody       = qs('cat-tbody');
  $empty       = qs('cat-empty');
  $meta        = qs('cat-meta');
  $pageInfo    = qs('cat-page');
  $dialog      = qs('cat-dialog');
  $form        = qs('cat-form');
  $statusInput = qs('cat-status-input');
  $nameInput   = qs('cat-name');

  bindEventsOnce();
  applyRbacVisibility(document); // filtra +Nuevo al entrar

  // Defaults (por si venimos de otra vista)
  state.page = 1;

  // Primera carga
  await reload();
}
