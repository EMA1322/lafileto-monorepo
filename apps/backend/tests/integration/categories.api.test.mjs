import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { categoryRepository } = await import('../../src/repositories/categoryRepository.js');
const { categoryController } = await import('../../src/controllers/categoryController.js');
const { errorHandler } = await import('../../src/middlewares/errorHandler.js');
const originalRepository = { ...categoryRepository };

const initialSnapshot = [
  {
    id: 'cat-001',
    name: 'Bebidas',
    imageUrl: 'https://cdn.test/bebidas.png',
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-002',
    name: 'Postres',
    imageUrl: null,
    active: false,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z'
  },
  {
    id: 'cat-003',
    name: 'Verduras',
    imageUrl: null,
    active: true,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z'
  }
];

let categories = [];

function cloneRow(row) {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

function resetCategories() {
  categories = initialSnapshot.map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt)
  }));
}

resetCategories();

function sortItems(items, orderBy = 'name', orderDirection = 'asc') {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (orderBy === 'createdAt') {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
  if (orderDirection === 'desc') {
    sorted.reverse();
  }
  return sorted;
}

categoryRepository.list = async function list({
  page,
  pageSize,
  search,
  status = 'active',
  all = false,
  orderBy,
  orderDirection
} = {}) {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;

  let filtered = categories.slice();

  if (status === 'active') {
    filtered = filtered.filter((item) => item.active);
  } else if (status === 'inactive') {
    filtered = filtered.filter((item) => !item.active);
  }

  if (search && typeof search === 'string') {
    const needle = search.trim().toLowerCase();
    filtered = filtered.filter((item) => item.name.toLowerCase().includes(needle));
  }

  const sorted = sortItems(filtered, orderBy, orderDirection);

  if (all) {
    return { items: sorted.map(cloneRow), total: sorted.length };
  }

  const start = (normalizedPage - 1) * normalizedPageSize;
  const paged = sorted.slice(start, start + normalizedPageSize);
  return { items: paged.map(cloneRow), total: sorted.length };
};

categoryRepository.findById = async (id) => {
  const found = categories.find((item) => item.id === id);
  return found ? cloneRow(found) : null;
};

categoryRepository.findByName = async (name) => {
  const found = categories.find((item) => item.name === name);
  return found ? cloneRow(found) : null;
};

categoryRepository.update = async (id, data) => {
  const idx = categories.findIndex((item) => item.id === id);
  if (idx === -1) {
    throw Object.assign(new Error('Not found'), { code: 'P2025' });
  }
  const current = categories[idx];
  const next = {
    ...current,
    ...data,
    updatedAt: new Date()
  };
  categories[idx] = next;
  return cloneRow(next);
};

categoryRepository.create = async (data) => {
  const now = new Date();
  const created = {
    id: data.id || `cat-${String(categories.length + 1).padStart(3, '0')}`,
    name: data.name,
    imageUrl: data.imageUrl ?? null,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now
  };
  categories.push(created);
  return cloneRow(created);
};

categoryRepository.deleteById = async (id) => {
  const idx = categories.findIndex((item) => item.id === id);
  if (idx !== -1) {
    categories.splice(idx, 1);
  }
  return { id };
};

test.beforeEach(() => {
  resetCategories();
});

test.after(() => {
  Object.assign(categoryRepository, originalRepository);
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

test('GET /categories?status=all → incluye meta', async () => {
  const req = {
    validated: {
      query: {
        page: undefined,
        pageSize: undefined,
        search: undefined,
        status: 'all',
        all: false,
        orderBy: 'name',
        orderDir: 'asc'
      }
    }
  };
  const res = createResponse();
  let error = null;
  await categoryController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(Array.isArray(res.body?.data?.items));
  assert.ok(res.body?.data?.meta);
  assert.equal(res.body.data.meta.total, initialSnapshot.length);
});

test('PATCH /categories/:id cambia active y persiste', async () => {
  const req = {
    validated: {
      params: { id: 'cat-001' },
      body: { active: false }
    }
  };
  const res = createResponse();
  let error = null;
  await categoryController.toggle(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.active, false);

  const showReq = { validated: { params: { id: 'cat-001' } } };
  const showRes = createResponse();
  await categoryController.show(showReq, showRes, () => {});
  assert.equal(showRes.statusCode, 200);
  assert.equal(showRes.body?.data?.active, false);
});

test('PUT /categories/:id actualiza name e imageUrl', async () => {
  const req = {
    validated: {
      params: { id: 'cat-003' },
      body: { name: 'Verduras Orgánicas', imageUrl: 'https://cdn.test/verduras.png' }
    }
  };
  const res = createResponse();
  let error = null;
  await categoryController.update(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.name, 'Verduras Orgánicas');
  assert.equal(res.body?.data?.imageUrl, 'https://cdn.test/verduras.png');

  const showReq = { validated: { params: { id: 'cat-003' } } };
  const showRes = createResponse();
  await categoryController.show(showReq, showRes, () => {});
  assert.equal(showRes.statusCode, 200);
  assert.equal(showRes.body?.data?.name, 'Verduras Orgánicas');
  assert.equal(showRes.body?.data?.imageUrl, 'https://cdn.test/verduras.png');
});

test('GET /categories/:id inexistente → 404', async () => {
  const req = { validated: { params: { id: 'cat-999' } } };
  const res = createResponse();
  let capturedError = null;
  await categoryController.show(req, res, (err) => {
    capturedError = err;
  });

  assert.ok(capturedError, 'Debe propagar error');
  const errorRes = createResponse();
  await errorHandler(capturedError, req, errorRes, () => {});
  assert.equal(errorRes.statusCode, 404);
  assert.equal(errorRes.body?.ok, false);
  assert.equal(errorRes.body?.error?.code, 'CATEGORY_NOT_FOUND');
});
