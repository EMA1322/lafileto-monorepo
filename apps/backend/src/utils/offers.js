// Utilidades para ofertas (cálculo de vigencia y precios)

function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

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

export function isOfferActive(offer, referenceDate = new Date()) {
  if (!offer) return false;
  const now = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
    ? referenceDate
    : new Date();
  const start = toDate(offer.startAt);
  const end = toDate(offer.endAt);

  if (start && now < start) {
    return false;
  }
  if (end && now > end) {
    return false;
  }
  return true;
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
  if (!offer) {
    return {
      isActive: false,
      finalPrice: basePrice,
      priceFinal: basePrice,
      discountPercent: null,
      discountPct: undefined
    };
  }
  const reference = now instanceof Date ? now : new Date();
  const active = isOfferActive(offer, reference);
  const finalPrice = active ? applyDiscount(basePrice, offer.discountPct) : basePrice;
  const discountPercent = Number.isFinite(offer.discountPct) ? offer.discountPct : null;

  return {
    id: offer.id ?? undefined,
    discountPercent,
    discountPct: offer.discountPct ?? undefined,
    startAt: offer.startAt ?? undefined,
    endAt: offer.endAt ?? undefined,
    isActive: active,
    finalPrice,
    priceFinal: finalPrice
  };
}
