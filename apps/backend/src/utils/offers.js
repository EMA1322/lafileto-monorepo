// Utilidades para ofertas (cálculo de precios)

function normalizePrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (value && typeof value.toNumber === 'function') {
    const converted = value.toNumber();
    return Number.isFinite(converted) ? converted : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

export function normalizeDiscountPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (rounded < 1 || rounded > 100) return null;
  return rounded;
}

export function applyDiscount(price, discountPct) {
  const normalizedPrice = normalizePrice(price);
  const pct = Number.isFinite(discountPct) ? discountPct : Number(discountPct);
  if (!Number.isFinite(pct) || pct <= 0) {
    return roundCurrency(normalizedPrice);
  }
  const ratio = Math.max(0, Math.min(100, pct)) / 100;
  const discounted = normalizedPrice * (1 - ratio);
  return roundCurrency(discounted);
}

export function buildOfferSummary(offer, price, { now } = {}) {
  const basePrice = roundCurrency(normalizePrice(price));
  const discountPercent = normalizeDiscountPercent(
    offer?.discountPercent ?? offer?.discountPct ?? undefined
  );
  if (!offer || !discountPercent) {
    return null;
  }
  const finalPrice = applyDiscount(basePrice, discountPercent);

  return {
    id: offer.id ?? undefined,
    discountPercent,
    isActive: true,
    finalPrice
  };
}
