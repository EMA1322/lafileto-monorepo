import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { userRepository } = await import('../../src/repositories/userRepository.js');
const { userController } = await import('../../src/controllers/userController.js');

const originalRepository = { ...userRepository };

const fixture = [
  {
    id: 1,
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+1 555 1000',
    roleId: 'role-admin',
    status: 'ACTIVE'
  },
  {
    id: 2,
    fullName: 'Grace Hopper',
    email: 'grace@example.com',
    phone: '+1 555 1001',
    roleId: 'role-editor',
    status: 'ACTIVE'
  },
  {
    id: 3,
    fullName: 'Linus Torvalds',
    email: 'linus@example.com',
    phone: '+1 555 1002',
    roleId: 'role-viewer',
    status: 'INACTIVE'
  }
];

let users = [];

function resetUsers() {
  users = fixture.map((item) => ({ ...item }));
}

resetUsers();

function sortUsers(list, orderBy = 'fullName', orderDirection = 'asc') {
  const sorted = [...list];
  sorted.sort((a, b) => {
    if (orderBy === 'email') {
      return a.email.localeCompare(b.email, 'en');
    }
    if (orderBy === 'status') {
      return a.status.localeCompare(b.status, 'en');
    }
    if (orderBy === 'id') {
      return a.id - b.id;
    }
    return a.fullName.localeCompare(b.fullName, 'en', { sensitivity: 'base' });
  });
  if (orderDirection === 'desc') {
    sorted.reverse();
  }
  return sorted;
}

userRepository.list = async function list({
  page,
  pageSize,
  q,
  orderBy,
  orderDirection,
  all
} = {}) {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;

  let filtered = users.slice();
  if (q && typeof q === 'string') {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter((item) =>
      item.fullName.toLowerCase().includes(needle) || item.email.toLowerCase().includes(needle)
    );
  }

  const ordered = sortUsers(filtered, orderBy, orderDirection);

  if (all) {
    return { items: ordered.map((item) => ({ ...item })), total: ordered.length };
  }

  const start = (normalizedPage - 1) * normalizedPageSize;
  const items = ordered.slice(start, start + normalizedPageSize);
  return { items: items.map((item) => ({ ...item })), total: ordered.length };
};

test.beforeEach(() => {
  resetUsers();
});

test.after(() => {
  Object.assign(userRepository, originalRepository);
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

test('GET /users retorna meta con pageCount', async () => {
  const req = {
    validated: {
      query: {
        page: 1,
        pageSize: 2,
        q: undefined,
        all: false,
        orderBy: 'fullName',
        orderDir: 'asc'
      }
    }
  };
  const res = createResponse();
  let error = null;

  await userController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(Array.isArray(res.body?.data?.items));
  assert.deepEqual(res.body?.data?.meta, {
    page: 1,
    pageSize: 2,
    total: fixture.length,
    pageCount: 2
  });
});

test('GET /users?all=1 limita pageSize y mantiene meta', async () => {
  const req = {
    validated: {
      query: {
        page: 3,
        pageSize: 200,
        q: 'ex',
        all: true,
        orderBy: 'email',
        orderDir: 'desc'
      }
    }
  };
  const res = createResponse();
  let error = null;

  await userController.list(req, res, (err) => {
    error = err;
  });

  assert.equal(error, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(Array.isArray(res.body?.data?.items));
  assert.equal(res.body?.data?.items.length, fixture.length);
  assert.deepEqual(res.body?.data?.meta, {
    page: 1,
    pageSize: 100,
    total: fixture.length,
    pageCount: 1
  });
});
