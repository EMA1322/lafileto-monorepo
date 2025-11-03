import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { productRepository } = await import('../../src/repositories/productRepository.js');
const { categoryRepository } = await import('../../src/repositories/categoryRepository.js');
const { offerRepository } = await import('../../src/repositories/offerRepository.js');
const { productsController } = await import('../../src/controllers/productsController.js');
const { offersController } = await import('../../src/controllers/offersController.js');
const { errorHandler } = await import('../../src/middlewares/errorHandler.js');

const originalProductRepository = { ...productRepository };
const originalCategoryRepository = { ...categoryRepository };
const originalOfferRepository = { ...offerRepository };

const categoriesFixture = new Map([
  ['cat-001', { id: 'cat-001', name: 'Principales' }],
  ['cat-002', { id: 'cat-002', name: 'Pizzas' }]
]);

const initialProducts = [
  {
    id: 'prod-001',
    name: 'Pollo al Horno',
    slug: 'pollo-al-horno',
    sku: 'POL-001',
    description: 'Clásico de la casa',
    price: 2500,
    currency: 'ARS',
    stock: 15,
    status: 'ACTIVE',
    isFeatured: true,
    categoryId: 'cat-001',
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z')
  },
  {
    id: 'prod-002',
    name: 'Pollo a la Parrilla',
    slug: 'pollo-a-la-parrilla',
    sku: 'POL-002',
    description: 'Servido con papas rústicas',
    price: 2100,
    currency: 'ARS',
    stock: 12,
    status: 'ACTIVE',
    isFeatured: true,
    categoryId: 'cat-001',
    createdAt: new Date('2024-01-05T10:00:00.000Z'),
    updatedAt: new Date('2024-01-05T10:00:00.000Z')
  },
  {
    id: 'prod-003',
    name: 'Milanesa Napolitana',
    slug: 'milanesa-napolitana',
    sku: 'MIL-001',
    description: 'Con puré de papas',
    price: 1900,
    currency: 'ARS',
    stock: 20,
    status: 'DRAFT',
    isFeatured: false,
    categoryId: 'cat-001',
    createdAt: new Date('2024-02-01T10:00:00.000Z'),
    updatedAt: new Date('2024-02-01T10:00:00.000Z')
  },
  {
    id: 'prod-004',
    name: 'Pizza Napolitana',
    slug: 'pizza-napolitana',
    sku: 'PIZ-001',
    description: 'Con tomate y mozzarella',
    price: 3300,
    currency: 'ARS',
    stock: 8,
    status: 'ARCHIVED',
    isFeatured: false,
    categoryId: 'cat-002',
    createdAt: new Date('2024-02-15T10:00:00.000Z'),
    updatedAt: new Date('2024-02-15T10:00:00.000Z')
  },
  {
    id: 'prod-005',
    name: 'Ensalada César',
    slug: 'ensalada-cesar',
    sku: 'ENS-001',
    description: 'Lechuga, pollo y crutones',
    price: 1500,
    currency: 'ARS',
    stock: 10,
    status: 'ACTIVE',
    isFeatured: false,
    categoryId: 'cat-001',
    createdAt: new Date('2024-03-01T10:00:00.000Z'),
    updatedAt: new Date('2024-03-01T10:00:00.000Z')
  },
  {
    id: 'prod-006',
    name: 'Lasaña Boloñesa',
    slug: 'lasana-bolonesa',
    sku: 'LAS-001',
    description: 'Capas de pasta y carne',
    price: 2800,
    currency: 'ARS',
    stock: 6,
    status: 'ACTIVE',
    isFeatured: false,
    categoryId: 'cat-002',
    createdAt: new Date('2024-03-10T10:00:00.000Z'),
    updatedAt: new Date('2024-03-10T10:00:00.000Z')
  }
];

let products = [];

const initialOffers = [
  {
    id: 'offer-001',
    productId: 'prod-001',
    discountPct: 10,
    startAt: new Date('2024-01-01T00:00:00.000Z'),
    endAt: new Date('2026-01-01T00:00:00.000Z')
  },
  {
    id: 'offer-002',
    productId: 'prod-002',
    discountPct: 20,
    startAt: new Date('2024-02-01T00:00:00.000Z'),
    endAt: null
  },
  {
    id: 'offer-003',
    productId: 'prod-003',
    discountPct: 15,
    startAt: null,
    endAt: new Date('2026-12-31T23:59:59.000Z')
  },
  {
    id: 'offer-004',
    productId: 'prod-004',
    discountPct: 5,
    startAt: null,
    endAt: null
  },
  {
    id: 'offer-005',
    productId: 'prod-005',
    discountPct: 30,
    startAt: new Date('2035-01-01T00:00:00.000Z'),
    endAt: null
  }
];

let offers = new Map();

function cloneProduct(product) {
  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt)
  };
}

function resetProducts() {
  products = initialProducts.map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt)
  }));
}

function cloneOffer(offer) {
  return {
    ...offer,
    startAt: offer.startAt ? new Date(offer.startAt) : null,
    endAt: offer.endAt ? new Date(offer.endAt) : null,
    createdAt: offer.createdAt ? new Date(offer.createdAt) : undefined,
    updatedAt: offer.updatedAt ? new Date(offer.updatedAt) : undefined
  };
}

function resetOffers() {
  offers = new Map();
  for (const entry of initialOffers) {
    offers.set(entry.productId, cloneOffer(entry));
  }
}

resetProducts();

function sortProducts(list, orderBy = 'name', orderDirection = 'asc') {
  const sorted = [...list];
  sorted.sort((a, b) => {
    if (orderBy === 'price') {
      return a.price - b.price;
    }
    if (orderBy === 'updatedAt') {
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    }
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
  if (orderDirection === 'desc') {
    sorted.reverse();
  }
  return sorted;
}

productRepository.list = async function list({
  page = 1,
  pageSize = 10,
  q,
  status = 'all',
  categoryId,
  isFeatured,
  priceMin,
  priceMax,
  orderBy = 'name',
  orderDirection = 'asc',
  all = false
} = {}) {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;

  let filtered = products.slice();

  if (typeof q === 'string' && q.trim().length > 0) {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter((item) =>
      item.name.toLowerCase().includes(needle) ||
      item.slug.toLowerCase().includes(needle) ||
      item.sku.toLowerCase().includes(needle)
    );
  }

  if (typeof status === 'string' && status !== 'all') {
    const target = status.trim().toUpperCase();
    filtered = filtered.filter((item) => item.status === target);
  }

  if (typeof categoryId === 'string' && categoryId.trim().length > 0) {
    filtered = filtered.filter((item) => item.categoryId === categoryId.trim());
  }

  if (typeof isFeatured === 'boolean') {
    filtered = filtered.filter((item) => item.isFeatured === isFeatured);
  }

  if (Number.isFinite(priceMin)) {
    filtered = filtered.filter((item) => item.price >= priceMin);
  }

  if (Number.isFinite(priceMax)) {
    filtered = filtered.filter((item) => item.price <= priceMax);
  }

  const ordered = sortProducts(filtered, orderBy, orderDirection);

  if (all) {
    return { items: ordered.map(cloneProduct), total: ordered.length };
  }

  const start = (normalizedPage - 1) * normalizedPageSize;
  const items = ordered.slice(start, start + normalizedPageSize).map(cloneProduct);
  return { items, total: ordered.length };
};

productRepository.findById = async (id) => {
  const found = products.find((item) => item.id === id);
  return found ? cloneProduct(found) : null;
};

productRepository.findBySlug = async (slug) => {
  const found = products.find((item) => item.slug === slug);
  return found ? cloneProduct(found) : null;
};

productRepository.findBySku = async (sku) => {
  const found = products.find((item) => item.sku === sku);
  return found ? cloneProduct(found) : null;
};

productRepository.create = async (data) => {
  const now = new Date();
  const created = {
    id: data.id || `prod-${String(products.length + 1).padStart(3, '0')}`,
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    description: data.description ?? null,
    price: Number.parseFloat(data.price),
    currency: data.currency,
    stock: data.stock,
    status: data.status,
    isFeatured: data.isFeatured,
    categoryId: data.categoryId,
    createdAt: now,
    updatedAt: now
  };
  products.push(created);
  return cloneProduct(created);
};

productRepository.update = async (id, data) => {
  const idx = products.findIndex((item) => item.id === id);
  if (idx === -1) {
    throw Object.assign(new Error('Not found'), { code: 'P2025' });
  }
  const current = products[idx];
  const next = {
    ...current,
    ...data,
    price: data.price !== undefined ? Number.parseFloat(data.price) : current.price,
    stock: data.stock !== undefined ? Number(data.stock) : current.stock,
    updatedAt: new Date()
  };
  products[idx] = next;
  return cloneProduct(next);
};

productRepository.updateStatus = async (id, status) => {
  const idx = products.findIndex((item) => item.id === id);
  if (idx === -1) {
    throw Object.assign(new Error('Not found'), { code: 'P2025' });
  }
  products[idx] = {
    ...products[idx],
    status,
    updatedAt: new Date()
  };
  return cloneProduct(products[idx]);
};

productRepository.deleteById = async (id) => {
  const idx = products.findIndex((item) => item.id === id);
  if (idx !== -1) {
    products.splice(idx, 1);
  }
  return { id };
};

function isOfferActiveStub(offer, reference = new Date()) {
  if (!offer) return false;
  const now = reference instanceof Date && !Number.isNaN(reference.getTime()) ? reference : new Date();
  const start = offer.startAt ? new Date(offer.startAt) : null;
  const end = offer.endAt ? new Date(offer.endAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function sortOfferEntries(entries, orderBy = 'name', orderDirection = 'asc') {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    if (orderBy === 'price') {
      return a.product.price - b.product.price;
    }
    if (orderBy === 'updatedAt') {
      return a.product.updatedAt.getTime() - b.product.updatedAt.getTime();
    }
    return a.product.name.localeCompare(b.product.name, 'es', { sensitivity: 'base' });
  });
  if (orderDirection === 'desc') {
    sorted.reverse();
  }
  return sorted;
}

offerRepository.findActiveByProductId = async (productId, { now } = {}) => {
  if (!productId) return null;
  const offer = offers.get(productId);
  if (!offer) return null;
  const reference = now instanceof Date ? now : new Date();
  return isOfferActiveStub(offer, reference) ? cloneOffer(offer) : null;
};

offerRepository.findActiveByProductIds = async (productIds = [], { now } = {}) => {
  const map = new Map();
  const reference = now instanceof Date ? now : new Date();
  for (const id of productIds) {
    const offer = offers.get(id);
    if (offer && isOfferActiveStub(offer, reference)) {
      map.set(id, cloneOffer(offer));
    }
  }
  return map;
};

offerRepository.listActiveOffers = async ({
  page = 1,
  pageSize = 10,
  q,
  status = 'all',
  categoryId,
  isFeatured,
  priceMin,
  priceMax,
  orderBy = 'name',
  orderDirection = 'asc',
  all = false,
  now
} = {}) => {
  const reference = now instanceof Date ? now : new Date();
  const entries = [];

  for (const [productId, offer] of offers.entries()) {
    if (!isOfferActiveStub(offer, reference)) continue;
    const product = products.find((item) => item.id === productId);
    if (!product) continue;
    entries.push({ offer: cloneOffer(offer), product: cloneProduct(product) });
  }

  const filtered = entries.filter(({ product }) => {
    if (typeof q === 'string' && q.trim().length > 0) {
      const needle = q.trim().toLowerCase();
      const haystack = [product.name, product.slug, product.sku].map((value) =>
        String(value ?? '').toLowerCase()
      );
      if (!haystack.some((field) => field.includes(needle))) {
        return false;
      }
    }

    if (typeof status === 'string' && status !== 'all') {
      if (product.status !== status.trim().toUpperCase()) {
        return false;
      }
    }

    if (typeof categoryId === 'string' && categoryId.trim().length > 0) {
      if (product.categoryId !== categoryId.trim()) {
        return false;
      }
    }

    if (typeof isFeatured === 'boolean') {
      if (product.isFeatured !== isFeatured) {
        return false;
      }
    }

    if (Number.isFinite(priceMin) && product.price < priceMin) {
      return false;
    }

    if (Number.isFinite(priceMax) && product.price > priceMax) {
      return false;
    }

    return true;
  });

  const sorted = sortOfferEntries(filtered, orderBy, orderDirection);

  if (all) {
    const items = sorted.map(({ offer, product }) => ({
      ...cloneOffer(offer),
      product: cloneProduct(product)
    }));
    return { items, total: items.length };
  }

  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const start = (normalizedPage - 1) * normalizedPageSize;
  const items = sorted.slice(start, start + normalizedPageSize).map(({ offer, product }) => ({
    ...cloneOffer(offer),
    product: cloneProduct(product)
  }));

  return { items, total: sorted.length };
};

categoryRepository.findById = async (id) => {
  return categoriesFixture.get(id) ?? null;
};

categoryRepository.findByName = async () => null;

test.beforeEach(() => {
  resetProducts();
  resetOffers();
});

test.after(() => {
  Object.assign(productRepository, originalProductRepository);
  Object.assign(categoryRepository, originalCategoryRepository);
  Object.assign(offerRepository, originalOfferRepository);
});

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('POST /products crea un producto nuevo', async () => {
  const req = {
    validated: {
      body: {
        name: 'Ravioles de espinaca',
        slug: 'ravioles-de-espinaca',
        sku: 'RAV-010',
        description: 'Con salsa rosa',
        price: 1850.5,
        currency: 'ARS',
        stock: 30,
        status: 'active',
        isFeatured: false,
        categoryId: 'cat-001'
      }
    }
  };
  const res = createResponse();
  let error = null;

  await productsController.create(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.slug, 'ravioles-de-espinaca');
  assert.equal(res.body?.data?.sku, 'RAV-010');
  assert.equal(res.body?.data?.price, 1850.5);
  assert.equal(res.body?.data?.status, 'active');
  assert.equal(products.length, initialProducts.length + 1);
});

test('GET /products/:id devuelve el detalle', async () => {
  const req = { validated: { params: { id: 'prod-001' } } };
  const res = createResponse();
  let error = null;

  await productsController.show(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.id, 'prod-001');
  assert.equal(res.body?.data?.price, 2500);
  assert.equal(res.body?.data?.offer?.isActive, true);
  assert.equal(res.body?.data?.offer?.discountPct, 10);
  assert.equal(res.body?.data?.offer?.priceFinal, 2250);
});

test('PUT /products/:id actualiza datos principales', async () => {
  const req = {
    validated: {
      params: { id: 'prod-002' },
      body: {
        name: 'Pollo a la Parrilla Especial',
        price: 2250.75,
        stock: 18,
        isFeatured: false
      }
    }
  };
  const res = createResponse();
  let error = null;

  await productsController.update(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.name, 'Pollo a la Parrilla Especial');
  assert.equal(res.body?.data?.price, 2250.75);
  assert.equal(res.body?.data?.isFeatured, false);
});

test('DELETE /products/:id elimina el producto', async () => {
  const req = { validated: { params: { id: 'prod-004' } } };
  const res = createResponse();
  let error = null;

  await productsController.remove(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.deleted, true);
  assert.equal(products.find((item) => item.id === 'prod-004'), undefined);
});

test('POST /products con slug duplicado retorna 409', async () => {
  const req = {
    validated: {
      body: {
        name: 'Pollo BBQ',
        slug: 'pollo-al-horno',
        sku: 'POL-999',
        price: 2600,
        currency: 'ARS',
        stock: 5,
        status: 'active',
        isFeatured: false,
        categoryId: 'cat-001'
      }
    }
  };
  const res = createResponse();
  let capturedError = null;

  await productsController.create(req, res, (err) => {
    capturedError = err;
  });

  assert.ok(capturedError, 'Debe retornar error por slug duplicado');
  const errorRes = createResponse();
  await errorHandler(capturedError, req, errorRes, () => {});
  assert.equal(errorRes.statusCode, 409);
  assert.equal(errorRes.body?.error?.code, 'RESOURCE_CONFLICT');
});

test('POST /products con SKU duplicado retorna 409', async () => {
  const req = {
    validated: {
      body: {
        name: 'Pollo a la Mostaza',
        slug: 'pollo-a-la-mostaza',
        sku: 'POL-002',
        price: 2400,
        currency: 'ARS',
        stock: 9,
        status: 'active',
        isFeatured: false,
        categoryId: 'cat-001'
      }
    }
  };
  const res = createResponse();
  let capturedError = null;

  await productsController.create(req, res, (err) => {
    capturedError = err;
  });

  assert.ok(capturedError, 'Debe retornar error por SKU duplicado');
  const errorRes = createResponse();
  await errorHandler(capturedError, req, errorRes, () => {});
  assert.equal(errorRes.statusCode, 409);
  assert.equal(errorRes.body?.error?.code, 'RESOURCE_CONFLICT');
});

test('GET /products con filtros combinados retorna meta coherente', async () => {
  const req = {
    validated: {
      query: {
        page: 1,
        pageSize: 1,
        q: 'pollo',
        status: 'active',
        categoryId: 'cat-001',
        isFeatured: true,
        priceMin: 2000,
        priceMax: 2600,
        orderBy: 'price',
        orderDir: 'desc',
        orderDirection: undefined,
        all: false
      }
    }
  };
  const res = createResponse();
  let error = null;

  await productsController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.items?.length, 1);
  assert.equal(res.body?.data?.items?.[0]?.price, 2500);
  assert.deepEqual(res.body?.data?.meta, {
    page: 1,
    pageSize: 1,
    total: 2,
    pageCount: 2
  });
});

test('GET /products?q=pollo es case-insensitive', async () => {
  const req = {
    validated: {
      query: {
        page: 1,
        pageSize: 10,
        q: 'PoLlO',
        status: 'all',
        categoryId: undefined,
        isFeatured: undefined,
        priceMin: undefined,
        priceMax: undefined,
        orderBy: 'name',
        orderDir: 'asc',
        orderDirection: undefined,
        all: false
      }
    }
  };
  const res = createResponse();
  let error = null;

  await productsController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.items?.length, 2);
  assert.ok(res.body.data.items.every((item) => item.name.toLowerCase().includes('pollo')));
});

test('GET /products?all=1 retorna todos con meta normalizada', async () => {
  const req = {
    validated: {
      query: {
        page: 3,
        pageSize: 50,
        q: undefined,
        status: 'all',
        categoryId: undefined,
        isFeatured: undefined,
        priceMin: undefined,
        priceMax: undefined,
        orderBy: 'updatedAt',
        orderDir: 'asc',
        orderDirection: undefined,
        all: true
      }
    }
  };
  const res = createResponse();
  let error = null;

  await productsController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.items?.length, products.length);
  assert.deepEqual(res.body?.data?.meta, {
    page: 1,
    pageSize: 50,
    total: products.length,
    pageCount: 1
  });
});

test('GET /products incluye resumen de oferta con priceFinal según vigencia', async () => {
  const req = {
    validated: {
      query: {
        page: 1,
        pageSize: 10,
        q: undefined,
        status: 'all',
        categoryId: undefined,
        isFeatured: undefined,
        priceMin: undefined,
        priceMax: undefined,
        orderBy: 'name',
        orderDir: 'asc',
        orderDirection: undefined,
        all: false
      }
    }
  };
  const res = createResponse();
  let error = null;

  await productsController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  const items = res.body?.data?.items ?? [];
  assert.ok(items.length >= products.length);

  const map = new Map(items.map((item) => [item.id, item]));

  const horno = map.get('prod-001');
  assert.equal(horno.offer?.isActive, true);
  assert.equal(horno.offer?.discountPct, 10);
  assert.equal(horno.offer?.priceFinal, 2250);

  const parrilla = map.get('prod-002');
  assert.equal(parrilla.offer?.isActive, true);
  assert.equal(parrilla.offer?.priceFinal, 1680);

  const milanesa = map.get('prod-003');
  assert.equal(milanesa.offer?.isActive, true);
  assert.equal(milanesa.offer?.priceFinal, 1615);

  const pizza = map.get('prod-004');
  assert.equal(pizza.offer?.isActive, true);
  assert.equal(pizza.offer?.priceFinal, 3135);

  const ensalada = map.get('prod-005');
  assert.equal(ensalada.offer?.isActive, false);
  assert.equal(ensalada.offer?.priceFinal, 1500);
  assert.equal(ensalada.offer?.id, undefined);

  const lasana = map.get('prod-006');
  assert.equal(lasana.offer?.isActive, false);
  assert.equal(lasana.offer?.priceFinal, 2800);
});

test('GET /offers devuelve sólo productos con ofertas activas', async () => {
  const req = {
    validated: {
      query: {
        page: 1,
        pageSize: 10,
        q: undefined,
        status: 'all',
        categoryId: undefined,
        isFeatured: undefined,
        priceMin: undefined,
        priceMax: undefined,
        orderBy: 'name',
        orderDir: 'asc',
        orderDirection: undefined,
        all: false
      }
    }
  };
  const res = createResponse();
  let error = null;

  await offersController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);

  const items = res.body?.data?.items ?? [];
  assert.ok(items.length > 0);
  assert.ok(items.every((item) => item.offer?.isActive === true));

  const ids = items.map((item) => item.id);
  assert.ok(!ids.includes('prod-005'));
  assert.ok(!ids.includes('prod-006'));

  const offerSummary = items.find((item) => item.id === 'prod-001');
  assert.equal(offerSummary.offer.priceFinal, 2250);
  assert.equal(res.body?.data?.meta?.total, items.length);
});
