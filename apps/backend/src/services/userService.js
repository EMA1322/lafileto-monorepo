// Servicio Users: listados paginados desde Prisma
import { userRepository } from '../repositories/userRepository.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function normalizePage(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PAGE;
}

function normalizePageSize(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

export const userService = {
  async listUsers({ page, pageSize, search } = {}) {
    const normalizedPage = normalizePage(page);
    const normalizedPageSize = normalizePageSize(pageSize);
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';

    const { items, total } = await userRepository.list({
      page: normalizedPage,
      pageSize: normalizedPageSize,
      search: normalizedSearch ? normalizedSearch : undefined
    });

    return {
      items,
      meta: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total
      }
    };
  }
};
