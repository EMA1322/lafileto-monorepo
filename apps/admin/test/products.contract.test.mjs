import assert from 'node:assert/strict';

import {
  mapProductFromApi,
  resolveOfferPricing,
} from '../src/components/products/products.helpers.js';
import { validateOfferForm } from '../src/components/products/products.modals.js';

function testProductMapping() {
  const raw = {
    id: 'p-1',
    name: 'Combo Fase 2',
    slug: 'legacy-slug',
    sku: 'SKU-123',
    currency: 'USD',
    description: 'Producto con oferta',
    price: 1000,
    stock: 5,
    categoryId: 'cat-1',
    status: 'active',
    imageUrl: 'https://example.com/img.png',
    offer: {
      id: 'o-1',
      discountPercent: 25,
      finalPrice: 750,
    },
  };

  const mapped = mapProductFromApi(raw);
  assert.equal(mapped.id, 'p-1');
  assert.equal(mapped.name, 'Combo Fase 2');
  assert.equal(mapped.description, 'Producto con oferta');
  assert.equal(mapped.categoryId, 'cat-1');
  assert.equal(mapped.status, 'active');
  assert.equal(mapped.imageUrl, 'https://example.com/img.png');
  assert.equal(mapped.price, 1000);
  assert.ok(mapped.offer);
  assert.equal(mapped.offer.discountPercent, 25);
  assert.equal(mapped.offer.finalPrice, 750);
  assert.equal(mapped.offer.startsAt, undefined);
  assert.equal(mapped.offer.endsAt, undefined);
  assert.ok(!('slug' in mapped));
  assert.ok(!('sku' in mapped));
  assert.ok(!('currency' in mapped));
  assert.ok(!('isFeatured' in mapped));
}

function testOfferValidation() {
  const disabled = validateOfferForm({ enabled: false, discount: 'not-a-number' });
  assert.equal(disabled.errors.length, 0);
  assert.equal(disabled.payload.enabled, false);
  assert.equal(disabled.payload.discountPercent, null);

  const zeroPercent = validateOfferForm({ enabled: true, discount: '0' });
  assert.ok(zeroPercent.errors.some((err) => err.field === 'offerDiscountPercent'));

  const overLimit = validateOfferForm({ enabled: true, discount: '150' });
  assert.ok(overLimit.errors.some((err) => err.field === 'offerDiscountPercent'));

  const valid = validateOfferForm({
    enabled: true,
    discount: '10',
  });
  assert.equal(valid.errors.length, 0);
  assert.equal(valid.payload.discountPercent, 10);
}

function testOfferPricingFromSummary() {
  const product = {
    price: 200,
    offer: {
      isActive: true,
      discountPercent: 20,
      finalPrice: 160,
    },
  };
  const pricing = resolveOfferPricing(product);
  assert.equal(pricing.hasActiveOffer, true);
  assert.equal(pricing.originalPrice, 200);
  assert.equal(pricing.finalPrice, 160);
  assert.equal(pricing.discountPercent, 20);
}

export function runProductsContractTests() {
  testProductMapping();
  testOfferValidation();
  testOfferPricingFromSummary();
}
