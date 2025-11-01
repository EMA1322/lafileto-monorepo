import test from 'node:test';
import assert from 'node:assert/strict';

import { createCorsTestApp, setAllowlistAndReload } from './setup-env.mjs';

const { buildCorsOptions } = await import('../cors.js');

async function performRequest(app, {
  method = 'GET',
  path = '/',
  headers = {},
} = {}) {
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unexpected server address');
    }

    const url = new URL(path, `http://127.0.0.1:${address.port}`);
    const response = await fetch(url, { method, headers });
    const text = await response.text();

    return {
      status: response.status,
      headers: response.headers,
      text,
    };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}

function evaluateOrigin(options, origin) {
  return new Promise((resolve) => {
    options.origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

test('buildCorsOptions trims CSV and normalizes origins', async () => {
  const csvAllowlist = ' https://foo.test , https://bar.test,https://foo.test ';
  const options = buildCorsOptions(csvAllowlist);

  const allowedFoo = await evaluateOrigin(options, 'https://foo.test');
  assert.equal(allowedFoo.err, null);
  assert.equal(allowedFoo.allowed, true);

  const allowedBar = await evaluateOrigin(options, 'https://bar.test');
  assert.equal(allowedBar.err, null);
  assert.equal(allowedBar.allowed, true);
});

test('origin callback allows whitelisted origins and rejects others', async () => {
  const options = buildCorsOptions(['https://allowed.test']);

  const allowed = await evaluateOrigin(options, 'https://allowed.test');
  assert.equal(allowed.err, null);
  assert.equal(allowed.allowed, true);

  const anonymous = await evaluateOrigin(options, undefined);
  assert.equal(anonymous.err, null);
  assert.equal(anonymous.allowed, true);

  const denied = await evaluateOrigin(options, 'https://denied.test');
  assert(denied.err instanceof Error);
  assert.equal(denied.err.message, 'Not allowed by CORS: https://denied.test');
  assert.equal(denied.allowed, undefined);
});

test('preflight OPTIONS responds 204 with Access-Control-Allow-Origin header', async () => {
  const allowedOrigin = 'https://preflight.test';
  const { app } = await createCorsTestApp({ allowlist: allowedOrigin });

  const response = await performRequest(app, {
    method: 'OPTIONS',
    path: '/ping',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'GET',
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), allowedOrigin);

  await setAllowlistAndReload(undefined);
});

test('denies requests from origins outside of allowlist', async () => {
  const allowedOrigin = 'https://allowlisted.test';
  const deniedOrigin = 'https://denied.test';
  const { app } = await createCorsTestApp({ allowlist: allowedOrigin });

  const response = await performRequest(app, {
    method: 'GET',
    path: '/ping',
    headers: {
      Origin: deniedOrigin,
    },
  });

  assert.equal(response.status, 403);
  assert.equal(response.text, `Not allowed by CORS: ${deniedOrigin}`);

  await setAllowlistAndReload(undefined);
});
