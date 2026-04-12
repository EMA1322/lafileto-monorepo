import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  publicFetch,
  fetchPublicProducts,
  fetchPublicCategories,
  fetchPublicOffers,
  fetchPublicSettings,
  fetchBusinessStatus,
  fetchCommercialConfig,
} from '/src/api/public.js';

describe('public API contracts used by client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('maps every public endpoint to stable data shape', async () => {
    const responses = {
      '/public/products': [{ id: 10, name: 'Milanesa', price: 1000 }],
      '/public/categories': [{ id: 1, name: 'Main dishes', isActive: true }],
      '/public/offers': [{ id: 7, discountPercent: 20, product: { id: 10, name: 'Milanesa', price: 1000 } }],
      '/public/settings': { brandName: 'La Fileto' },
      '/public/business-status': { isOpen: true, message: 'Open' },
      '/public/commercial-config': { whatsapp: { number: '+54 11 1234-5678' } },
    };

    fetch.mockImplementation(async (url) => {
      const path = String(url).replace(/^.*\/api\/v1/, '');
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true, data: responses[path] };
        },
      };
    });

    await expect(fetchPublicProducts()).resolves.toEqual(responses['/public/products']);
    await expect(fetchPublicCategories()).resolves.toEqual(responses['/public/categories']);
    await expect(fetchPublicOffers()).resolves.toEqual(responses['/public/offers']);
    await expect(fetchPublicSettings()).resolves.toEqual(responses['/public/settings']);
    await expect(fetchBusinessStatus()).resolves.toEqual(responses['/public/business-status']);
    await expect(fetchCommercialConfig()).resolves.toEqual(responses['/public/commercial-config']);

    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it('keeps safe defaults for empty payloads used by the commercial flow', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return { ok: true, data: null };
      },
    });

    await expect(fetchPublicProducts()).resolves.toEqual([]);
    await expect(fetchPublicCategories()).resolves.toEqual([]);
    await expect(fetchPublicOffers()).resolves.toEqual([]);
    await expect(fetchPublicSettings()).resolves.toEqual({});
    await expect(fetchBusinessStatus()).resolves.toEqual({ isOpen: false });
    await expect(fetchCommercialConfig()).resolves.toEqual({ whatsapp: { number: '', message: '' } });
  });

  it('throws normalized errors from publicFetch', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 503,
      async json() {
        return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Gateway down' } };
      },
    });

    await expect(publicFetch('/public/products')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
      message: 'Gateway down',
    });
  });
});
