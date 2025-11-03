// /admin/src/utils/apis.js
// ------------------------------------------------------------
// Wrapper centralizado de endpoints REST específicos del panel.
// Comentarios en español; código y nombres en inglés.
// Cada función usa apiFetch (manejo de token + errores estándar).
// ------------------------------------------------------------

import { apiFetch } from './api.js';

/** Utilidad local para normalizar respuesta según contrato */
function ensureEnvelope(response) {
  if (!response || typeof response !== 'object') {
    return { ok: false, data: null, meta: null };
  }
  const { ok = true, data = null, meta = null } = response;
  return { ok, data, meta };
}

export const productsApi = {
  /** Lista productos con filtros y paginación */
  async list(params = {}, { signal } = {}) {
    const response = await apiFetch('/products', {
      method: 'GET',
      params,
      showErrorToast: false,
      signal,
    });
    return ensureEnvelope(response);
  },

  /** Obtiene un producto específico */
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
  /** Lista categorías (para selects y filtros) */
  async listAll(params = {}) {
    const response = await apiFetch('/categories', {
      method: 'GET',
      params: { ...params, all: params.all ?? 1, pageSize: params.pageSize ?? 100 },
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

export const apis = {
  products: productsApi,
  categories: categoriesApi,
  offers: offersApi,
};

export default apis;
