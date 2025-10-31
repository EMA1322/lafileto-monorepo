import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import request from 'supertest';
import cors from 'cors';

import { buildCorsOptions } from '../cors.js';

const noopLogger = { info: () => {}, debug: () => {} };

test('buildCorsOptions trims CSV entries and normalizes origins', () => {
  const logs = [];
  const logger = {
    info: message => logs.push(message),
    debug: () => {}
  };

  const { allowlist } = buildCorsOptions({
    allowlistCsv: ' http://localhost:5173/ ,http://192.168.1.34:5174 ',
    nodeEnv: 'development',
    logger
  });

  assert.deepEqual(allowlist, [
    'http://localhost:5173',
    'http://192.168.1.34:5174'
  ]);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /\[cors\] allowlist:/);
});

test('origin callback allows and rejects according to allowlist', async () => {
  const { options } = buildCorsOptions({
    allowlistCsv: 'http://192.168.1.34:5174',
    nodeEnv: 'development',
    logger: noopLogger
  });

  await new Promise((resolve, reject) => {
    options.origin('http://192.168.1.34:5174', (error, allow) => {
      try {
        assert.equal(error, null);
        assert.equal(allow, true);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });

  await new Promise((resolve, reject) => {
    options.origin('http://192.168.1.34:5173', (error, allow) => {
      try {
        assert.ok(error instanceof Error);
        assert.equal(error.message, 'Not allowed by CORS: http://192.168.1.34:5173');
        assert.equal(error.status, 403);
        assert.equal(allow, undefined);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

const createAppWithCors = options => {
  const app = express();
  const middleware = cors(options);
  app.use(middleware);
  app.options('*', middleware);
  app.get('/sample', (_req, res) => {
    res.json({ ok: true });
  });
  app.use((err, _req, res, _next) => {
    res.status(err.status || err.statusCode || 500).json({ message: err.message });
  });
  return app;
};

test('preflight OPTIONS returns 204 with expected headers when allowed', async () => {
  const { options } = buildCorsOptions({
    allowlistCsv: 'http://localhost:5174',
    nodeEnv: 'development',
    logger: noopLogger
  });

  const app = createAppWithCors(options);
  const response = await request(app)
    .options('/sample')
    .set('Origin', 'http://localhost:5174')
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'Content-Type');

  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5174');
});

test('preflight OPTIONS returns 403 when origin is not allowed', async () => {
  const { options } = buildCorsOptions({
    allowlistCsv: 'http://localhost:5174',
    nodeEnv: 'development',
    logger: noopLogger
  });

  const app = createAppWithCors(options);
  const response = await request(app)
    .options('/sample')
    .set('Origin', 'http://example.com')
    .set('Access-Control-Request-Method', 'GET');

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Not allowed by CORS: http://example.com');
});
