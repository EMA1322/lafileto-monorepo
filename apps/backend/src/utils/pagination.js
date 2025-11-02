const DEFAULT_PAGE_FALLBACK = 1;
const DEFAULT_PAGE_SIZE_FALLBACK = 10;

export function normalizePage(value, { defaultValue = DEFAULT_PAGE_FALLBACK } = {}) {
  const fallback = Number.isFinite(defaultValue) && defaultValue > 0
    ? Math.trunc(defaultValue)
    : DEFAULT_PAGE_FALLBACK;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizePageSize(
  value,
  { defaultValue = DEFAULT_PAGE_SIZE_FALLBACK, min, max } = {}
) {
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;
  let effectiveMin = hasMin ? Math.trunc(min) : undefined;
  let effectiveMax = hasMax ? Math.trunc(max) : undefined;

  if (hasMin && hasMax && effectiveMin > effectiveMax) {
    const swap = effectiveMin;
    effectiveMin = effectiveMax;
    effectiveMax = swap;
  }

  let fallback = Number.isFinite(defaultValue) && defaultValue > 0
    ? Math.trunc(defaultValue)
    : DEFAULT_PAGE_SIZE_FALLBACK;

  if (hasMin && fallback < effectiveMin) {
    fallback = effectiveMin;
  }
  if (hasMax && fallback > effectiveMax) {
    fallback = effectiveMax;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed <= 0) {
    return hasMin ? effectiveMin : fallback;
  }

  let result = parsed;
  if (hasMin && result < effectiveMin) {
    result = effectiveMin;
  }
  if (hasMax && result > effectiveMax) {
    result = effectiveMax;
  }

  return result;
}
