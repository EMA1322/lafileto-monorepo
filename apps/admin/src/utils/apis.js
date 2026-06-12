// /admin/src/utils/apis.js
// ------------------------------------------------------------
// Wrapper centralizado de endpoints REST especificos del panel.
// Comentarios en espanol; codigo y nombres en ingles.
// Cada funcion usa apiFetch (manejo de token + errores estandar).
// ------------------------------------------------------------

import { apiFetch } from './api.js';

/** Utilidad local para normalizar respuesta segun contrato */
function ensureEnvelope(response) {
  if (!response || typeof response !== 'object') {
    return { ok: false, data: null, meta: null };
  }
  const { ok = true, data = null, meta = null } = response;
  return { ok, data, meta };
}

export const productsApi = {
  /** Lista productos con filtros y paginacion */
  async list(params = {}, { signal } = {}) {
    const response = await apiFetch('/products', {
      method: 'GET',
      params,
      showErrorToast: false,
      signal,
    });
    return ensureEnvelope(response);
  },

  /** Obtiene un producto especifico */
  async get(id) {
    if (!id) throw new Error('Product id is required');
    const response = await apiFetch(`/products/${encodeURIComponent(id)}`, {
      method: 'GET',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Crea un nuevo producto */
  async create(payload) {
    const response = await apiFetch('/products', {
      method: 'POST',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Actualiza un producto existente */
  async update(id, payload) {
    if (!id) throw new Error('Product id is required');
    const response = await apiFetch(`/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Cambia el estado de un producto */
  async changeStatus(id, payload) {
    if (!id) throw new Error('Product id is required');
    const response = await apiFetch(`/products/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Elimina un producto */
  async remove(id) {
    if (!id) throw new Error('Product id is required');
    const response = await apiFetch(`/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },
};

export const categoriesApi = {
  /** Lista categorias (para selects y filtros) */
  async listAll(params = {}) {
    const response = await apiFetch('/categories', {
      method: 'GET',
      params: { ...params, all: params.all ?? 1, pageSize: params.pageSize ?? 100 },
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Lista categorias con filtros y paginacion */
  async list(params = {}, { signal } = {}) {
    const response = await apiFetch('/categories', {
      method: 'GET',
      params,
      showErrorToast: false,
      signal,
    });
    return ensureEnvelope(response);
  },

  /** Obtiene una categoria especifica */
  async get(id) {
    if (!id) throw new Error('Category id is required');
    const response = await apiFetch(`/categories/${encodeURIComponent(id)}`, {
      method: 'GET',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Crea una categoria */
  async create(payload) {
    const response = await apiFetch('/categories', {
      method: 'POST',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Actualiza una categoria */
  async update(id, payload) {
    if (!id) throw new Error('Category id is required');
    const response = await apiFetch(`/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Cambia el flag active de una categoria */
  async toggleActive(id, active) {
    if (!id) throw new Error('Category id is required');
    const response = await apiFetch(`/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { active: Boolean(active) },
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Elimina una categoria */
  async remove(id) {
    if (!id) throw new Error('Category id is required');
    const response = await apiFetch(`/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },
};

export const offersApi = {
  /** Lista ofertas disponibles */
  async list(params = {}, { signal } = {}) {
    const response = await apiFetch('/offers', {
      method: 'GET',
      params,
      showErrorToast: false,
      signal,
    });
    return ensureEnvelope(response);
  },

  /** Crea una oferta para un producto */
  async create(payload) {
    const response = await apiFetch('/offers', {
      method: 'POST',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Actualiza una oferta existente */
  async update(id, payload) {
    if (!id) throw new Error('Offer id is required');
    const response = await apiFetch(`/offers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Elimina una oferta */
  async remove(id) {
    if (!id) throw new Error('Offer id is required');
    const response = await apiFetch(`/offers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },
};

export const usersApi = {
  /** Lista usuarios con filtros y paginacion */
  async list(params = {}, { signal } = {}) {
    const response = await apiFetch('/users', {
      method: 'GET',
      params,
      showErrorToast: false,
      signal,
    });
    return ensureEnvelope(response);
  },

  /** Crea un usuario */
  async create(payload) {
    const response = await apiFetch('/users', {
      method: 'POST',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Actualiza un usuario */
  async update(id, payload) {
    if (!id) throw new Error('User id is required');
    const response = await apiFetch(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Elimina un usuario */
  async remove(id) {
    if (!id) throw new Error('User id is required');
    const response = await apiFetch(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },
};

export const rolesApi = {
  /** Lista roles */
  async list(params = {}, { signal } = {}) {
    const response = await apiFetch('/roles', {
      method: 'GET',
      params,
      showErrorToast: false,
      signal,
    });
    return ensureEnvelope(response);
  },

  /** Crea un rol */
  async create(payload) {
    const response = await apiFetch('/roles', {
      method: 'POST',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Actualiza un rol */
  async update(roleId, payload) {
    if (!roleId) throw new Error('Role id is required');
    const response = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
      method: 'PUT',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Elimina un rol */
  async remove(roleId) {
    if (!roleId) throw new Error('Role id is required');
    const response = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
      method: 'DELETE',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Obtiene permisos de un rol */
  async getPermissions(roleId) {
    if (!roleId) throw new Error('Role id is required');
    const response = await apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
      method: 'GET',
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },

  /** Actualiza permisos de un rol */
  async updatePermissions(roleId, payload) {
    if (!roleId) throw new Error('Role id is required');
    const response = await apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
      method: 'PUT',
      body: payload,
      showErrorToast: false,
    });
    return ensureEnvelope(response);
  },
};

export const modulesApi = {
  /** Lista modulos disponibles para RBAC */
  async list({ signal } = {}) {
    const response = await apiFetch('/modules', {
      method: 'GET',
      showErrorToast: false,
      signal,
    });
    return ensureEnvelope(response);
  },
};

export const apis = {
  products: productsApi,
  categories: categoriesApi,
  offers: offersApi,
  users: usersApi,
  roles: rolesApi,
  modules: modulesApi,
};

export default apis;
