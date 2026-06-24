import assert from 'node:assert/strict';

import {
  buildProductsQuery,
  normalizeFilters,
  normalizeProduct,
} from '../src/react/products/productsList.helpers.js';
import {
  buildProductPayload,
  buildStatusFromActiveSwitch,
  createProductFormState,
  validateProductActivation,
  validateProductForm,
} from '../src/react/products/productForm.helpers.js';
import {
  buildOfferCreatePayload,
  buildOfferUpdatePayload,
  estimateOfferFinalPrice,
  hasPersistedOffer,
  validateOfferForm,
} from '../src/react/products/productOffer.helpers.js';

function testProductMapping() {
  const raw = {
    id: 'p-1',
    name: 'Combo Fase 2',
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
      isActive: true,
    },
  };

  const mapped = normalizeProduct(raw);
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
}

function testProductFormContract() {
  const state = createProductFormState({
    name: 'Pizza',
    description: 'Con muzzarella',
    price: 1200,
    stock: 4,
    categoryId: 'cat-1',
    status: 'active',
    imageUrl: 'https://example.com/pizza.png',
  });

  assert.deepEqual(state, {
    name: 'Pizza',
    description: 'Con muzzarella',
    price: '1200',
    stock: '4',
    categoryId: 'cat-1',
    status: 'active',
    imageUrl: 'https://example.com/pizza.png',
  });

  const payload = buildProductPayload(state);
  assert.deepEqual(payload, {
    name: 'Pizza',
    description: 'Con muzzarella',
    price: 1200,
    stock: 4,
    categoryId: 'cat-1',
    status: 'active',
    imageUrl: 'https://example.com/pizza.png',
  });
}

function testOfferValidation() {
  const empty = validateOfferForm({ discountPercent: '' });
  assert.equal(empty.discountPercent, 'Ingresa el porcentaje de descuento.');

  const zeroPercent = validateOfferForm({ discountPercent: '0' });
  assert.equal(zeroPercent.discountPercent, 'El descuento debe ser al menos 1%.');

  const overLimit = validateOfferForm({ discountPercent: '150' });
  assert.equal(overLimit.discountPercent, 'El descuento no puede superar el 100%.');

  const valid = validateOfferForm({ discountPercent: '10' });
  assert.deepEqual(valid, {});
}

function testProductActivationValidation() {
  const invalidPrice = validateProductActivation({
    name: 'Pizza',
    price: '0',
    stock: '4',
    categoryId: 'cat-1',
    status: 'draft',
  });
  assert.equal(invalidPrice.price, 'Para activar el producto, el precio debe ser mayor a 0.');
  assert.equal(Object.hasOwn(invalidPrice, 'stock'), false);

  const invalidStock = validateProductActivation({
    name: 'Pizza',
    price: '1200',
    stock: '0',
    categoryId: 'cat-1',
    status: 'draft',
  });
  assert.equal(invalidStock.stock, 'Para activar el producto, el stock debe ser mayor a 0.');
  assert.equal(Object.hasOwn(invalidStock, 'price'), false);

  const activeSubmitErrors = validateProductForm({
    name: 'Pizza',
    price: '0',
    stock: '0',
    categoryId: 'cat-1',
    status: 'active',
  });
  assert.equal(
    activeSubmitErrors.price,
    'Para publicar el producto, el precio debe ser mayor a 0.',
  );
  assert.equal(activeSubmitErrors.stock, 'Para publicar el producto, el stock debe ser mayor a 0.');

  const validActive = validateProductForm({
    name: 'Pizza',
    price: '1200',
    stock: '4',
    categoryId: 'cat-1',
    status: 'active',
  });
  assert.deepEqual(validActive, {});
}

function testProductStatusSwitchPayloads() {
  const draftState = {
    name: 'Pizza',
    description: 'Con muzzarella',
    price: '1200',
    stock: '4',
    categoryId: 'cat-1',
    status: buildStatusFromActiveSwitch({ status: 'active' }, false),
    imageUrl: '',
  };
  assert.equal(draftState.status, 'draft');
  assert.deepEqual(buildProductPayload(draftState), {
    name: 'Pizza',
    description: 'Con muzzarella',
    price: 1200,
    stock: 4,
    categoryId: 'cat-1',
    status: 'draft',
    imageUrl: null,
  });

  const archivedStatus = buildStatusFromActiveSwitch({ status: 'archived' }, false);
  assert.equal(archivedStatus, 'archived');
  assert.equal(buildProductPayload({ ...draftState, status: archivedStatus }).status, 'archived');
}

function testBuildQueryOfferFilter() {
  const all = buildProductsQuery({ hasOffer: 'all' });
  assert.equal(Object.hasOwn(all, 'hasOffer'), false);

  const onSale = buildProductsQuery({ hasOffer: 'true' });
  assert.equal(onSale.hasOffer, 'true');

  const noOffer = buildProductsQuery({ hasOffer: 'false' });
  assert.equal(noOffer.hasOffer, 'false');

  const compatible = normalizeFilters({ offer: 'true' });
  assert.equal(
    compatible.hasOffer,
    'true',
    'legacy offer filter remains a temporary compatibility alias for hasOffer',
  );
}

function testOfferPayloads() {
  assert.deepEqual(buildOfferCreatePayload({ id: 'p-1' }, { discountPercent: '15' }), {
    productId: 'p-1',
    discountPercent: 15,
  });
  assert.deepEqual(buildOfferUpdatePayload({ discountPercent: '20' }), {
    discountPercent: 20,
  });
}

function testOfferStateHelpers() {
  const product = {
    id: 'p-1',
    price: 1000,
    offer: {
      id: 'o-1',
      discountPercent: 15,
    },
  };

  assert.equal(hasPersistedOffer(product), true);
  assert.equal(hasPersistedOffer({ id: 'p-1' }), false);
  assert.equal(estimateOfferFinalPrice(product, { discountPercent: '15' }), 850);
}

export function runProductsContractTests() {
  testProductMapping();
  testProductFormContract();
  testOfferValidation();
  testProductActivationValidation();
  testProductStatusSwitchPayloads();
  testBuildQueryOfferFilter();
  testOfferPayloads();
  testOfferStateHelpers();
}
