import assert from 'node:assert/strict';
import { test } from 'node:test';
import cors from 'cors';
import http from 'node:http';

import { buildCorsOptions } from '../cors.js';

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
  const logger = { info: () => {}, debug: () => {} };
  const { options } = buildCorsOptions({
    allowlistCsv: 'http://192.168.1.34:5174',
    nodeEnv: 'development',
    logger
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
        assert.equal(allow, undefined);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test('preflight OPTIONS returns 204 with expected headers', async t => {
  const logger = { info: () => {}, debug: () => {} };
  const { options } = buildCorsOptions({
    allowlistCsv: 'http://localhost:5174',
    nodeEnv: 'development',
    logger
  });

  const middleware = cors(options);
  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise(resolve => {
    server.listen(0, resolve);
  });
  t.after(() => {
    server.close();
  });

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/sample`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5174',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5174');
});
