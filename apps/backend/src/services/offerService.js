// Servicio de ofertas activas
import { offerRepository } from '../repositories/offerRepository.js';
import { sanitizeProduct } from './productService.js';
import { normalizePage, normalizePageSize } from '../utils/pagination.js';
import { buildOfferSummary } from '../utils/offers.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 100;

export const offerService = {
  async listActiveOffers({
    page,
    pageSize,
    q,
    status,
    categoryId,
    priceMin,
    priceMax,
    orderBy,
    orderDir,
    orderDirection,
    all
  } = {}) {
    const normalizedPage = normalizePage(page, { defaultValue: DEFAULT_PAGE });
    const normalizedPageSize = normalizePageSize(pageSize, {
      defaultValue: DEFAULT_PAGE_SIZE,
      min: MIN_PAGE_SIZE,
      max: MAX_PAGE_SIZE
    });
    const normalizedAll = Boolean(all);
    const orderField = orderBy || 'name';
    const direction = orderDir ?? orderDirection ?? 'asc';

    const referenceNow = new Date();

    const repoParams = {
      page: normalizedAll ? DEFAULT_PAGE : normalizedPage,
      pageSize: normalizedAll ? MAX_PAGE_SIZE : normalizedPageSize,
      q,
      status,
      categoryId,
      priceMin,
      priceMax,
      orderBy: orderField,
      orderDirection: direction,
      all: normalizedAll,
      now: referenceNow
    };

    const { items, total } = await offerRepository.listActiveOffers(repoParams);

    const enriched = items.map((row) => {
      const product = sanitizeProduct(row.product);
      return {
        ...product,
        offer: buildOfferSummary(row, product?.price ?? 0, { now: referenceNow })
      };
    });

    const effectiveTotal = Number.isFinite(total) ? total : enriched.length;
    const pageCount = Math.max(1, Math.ceil(effectiveTotal / normalizedPageSize));

    return {
      items: enriched,
      meta: {
        page: normalizedAll ? 1 : normalizedPage,
        pageSize: normalizedPageSize,
        total: effectiveTotal,
        pageCount
      }
    };
  }
};
