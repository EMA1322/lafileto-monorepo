import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assertDatabaseTestEnvironment,
  assertIsolatedTestEnvironment,
  runDatabaseReset,
  assertSensitiveDatabaseOperation,
  assertSmokeTarget,
  SafetyError,
} from '../../scripts/db-safety.mjs';

const scriptPath = fileURLToPath(new URL('../../scripts/test.mjs', import.meta.url));
const safetyScriptPath = fileURLToPath(new URL('../../scripts/db-safety.mjs', import.meta.url));
const safeDatabaseUrl = 'mysql://user:password@127.0.0.1:3306/lafileto_test';
const safeShadowUrl = 'mysql://user:password@127.0.0.1:3306/lafileto_shadow_test';

function safeDbEnv(overrides = {}) {
  return {
    NODE_ENV: 'test',
    ALLOW_DB_TESTS: '1',
    DATABASE_URL: safeDatabaseUrl,
    SHADOW_DATABASE_URL: safeShadowUrl,
    ...overrides,
  };
}

function expectSafetyError(action, code) {
  assert.throws(action, (error) => error instanceof SafetyError && error.code === code);
}

test('isolated test validation rejects production NODE_ENV before spawning tests', () => {
  expectSafetyError(
    () => assertIsolatedTestEnvironment({ NODE_ENV: 'production' }),
    'NODE_ENV_MUST_BE_TEST',
  );

  const result = spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /NODE_ENV_MUST_BE_TEST/);
});

test('isolated mode accepts an unset NODE_ENV and requires a Prisma stub', () => {
  assert.deepEqual(assertIsolatedTestEnvironment({}), { nodeEnv: 'test', prismaStub: true });
});

test('PRISMA_CLIENT_STUB forces a deterministic client without importing a real connection', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      "import { isPrismaStub, prisma } from './src/config/prisma.js'; if (!isPrismaStub || !prisma.__lafiletoPrismaStub) process.exit(1); console.log('stub');",
    ],
    {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      env: { ...process.env, NODE_ENV: 'test', PRISMA_CLIENT_STUB: '1', DATABASE_URL: '' },
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'stub');
});

test('database tests require an explicit opt-in', () => {
  expectSafetyError(
    () => assertDatabaseTestEnvironment(safeDbEnv({ ALLOW_DB_TESTS: '' })),
    'DB_TEST_OPT_IN_REQUIRED',
  );
});

test('database tests reject remote hosts and non-disposable database names', () => {
  expectSafetyError(
    () =>
      assertDatabaseTestEnvironment(
        safeDbEnv({ DATABASE_URL: 'mysql://user:password@db.example.test:3306/lafileto_test' }),
      ),
    'DATABASE_URL_HOST_NOT_ALLOWED',
  );
  expectSafetyError(
    () =>
      assertDatabaseTestEnvironment(
        safeDbEnv({ DATABASE_URL: 'mysql://user:password@127.0.0.1:3306/lafileto' }),
      ),
    'DATABASE_URL_NAME_NOT_DISPOSABLE',
  );
});

test('database tests reject equal primary and shadow URLs', () => {
  expectSafetyError(
    () =>
      assertDatabaseTestEnvironment(safeDbEnv({ SHADOW_DATABASE_URL: safeDatabaseUrl }), {
        requireShadow: true,
      }),
    'DATABASE_AND_SHADOW_MUST_DIFFER',
  );
});

test('shadow database URLs require mysql and keep credentials out of errors', () => {
  for (const shadowUrl of [
    'postgres://user:very-secret@127.0.0.1:5432/lafileto_shadow_test',
    'http://user:very-secret@127.0.0.1/lafileto_shadow_test',
    'not a valid url',
  ]) {
    try {
      assertDatabaseTestEnvironment(safeDbEnv({ SHADOW_DATABASE_URL: shadowUrl }), {
        requireShadow: true,
      });
      assert.fail('Expected a safety error');
    } catch (error) {
      assert.equal(error instanceof SafetyError, true);
      assert.equal(error.message.includes('very-secret'), false);
      assert.equal(error.message.includes(shadowUrl), false);
    }
  }

  assert.deepEqual(assertDatabaseTestEnvironment(safeDbEnv(), { requireShadow: true }), {
    databaseName: 'lafileto_test',
  });
});

test('IPv6 loopback is normalized only for ::1 database and local smoke targets', () => {
  const ipv6DatabaseUrl = 'mysql://user:password@[::1]:3306/lafileto_test';
  const ipv6ShadowUrl = 'mysql://user:password@[::1]:3306/lafileto_shadow_test';

  assert.deepEqual(
    assertDatabaseTestEnvironment(
      safeDbEnv({ DATABASE_URL: ipv6DatabaseUrl, SHADOW_DATABASE_URL: ipv6ShadowUrl }),
      { requireShadow: true },
    ),
    { databaseName: 'lafileto_test' },
  );
  assert.deepEqual(
    assertSmokeTarget('local', {
      NODE_ENV: 'test',
      API_BASE: 'http://[::1]:3000/api/v1',
      ALLOW_LOCAL_SMOKE: '1',
    }),
    { mode: 'local', host: '::1' },
  );
  expectSafetyError(
    () =>
      assertDatabaseTestEnvironment(
        safeDbEnv({ DATABASE_URL: 'mysql://user:password@[::2]:3306/lafileto_test' }),
      ),
    'DATABASE_URL_HOST_NOT_ALLOWED',
  );
  expectSafetyError(
    () =>
      assertSmokeTarget('remote', {
        NODE_ENV: 'test',
        API_BASE: 'https://[::1]/api/v1',
        ALLOW_REMOTE_SMOKE: '1',
        SMOKE_EXPECTED_HOST: '::1',
      }),
    'SMOKE_REMOTE_HOST_NOT_ALLOWED',
  );
});

test('reset and seed reject production or missing reinforced confirmation', () => {
  expectSafetyError(
    () => assertSensitiveDatabaseOperation('migrate-reset', safeDbEnv({ ALLOW_DB_RESET: '1' })),
    'RESET_CONFIRMATION_REQUIRED',
  );
  expectSafetyError(
    () =>
      assertSensitiveDatabaseOperation(
        'migrate-reset',
        safeDbEnv({
          NODE_ENV: 'production',
          ALLOW_DB_RESET: '1',
          CONFIRM_DB_RESET: 'RESET_TEST_DATABASE',
        }),
      ),
    'PRODUCTION_NOT_ALLOWED',
  );
  expectSafetyError(
    () =>
      assertSensitiveDatabaseOperation(
        'seed',
        safeDbEnv({ NODE_ENV: 'production', ALLOW_DB_SEED: '1' }),
      ),
    'PRODUCTION_NOT_ALLOWED',
  );
});

test('db reset preflight rejects incomplete configurations before any child process', async () => {
  const invocations = [];
  const runner = async (...args) => invocations.push(args);

  await assert.rejects(
    () =>
      runDatabaseReset(
        safeDbEnv({ ALLOW_DB_RESET: '1', CONFIRM_DB_RESET: 'RESET_TEST_DATABASE' }),
        runner,
      ),
    (error) => error instanceof SafetyError && error.code === 'OPERATION_OPT_IN_REQUIRED',
  );
  assert.equal(invocations.length, 0);

  await assert.rejects(
    () => runDatabaseReset(safeDbEnv({ ALLOW_DB_RESET: '1', ALLOW_DB_SEED: '1' }), runner),
    (error) => error instanceof SafetyError && error.code === 'RESET_CONFIRMATION_REQUIRED',
  );
  assert.equal(invocations.length, 0);

  await assert.rejects(
    () =>
      runDatabaseReset(
        safeDbEnv({
          NODE_ENV: 'production',
          ALLOW_DB_RESET: '1',
          ALLOW_DB_SEED: '1',
          CONFIRM_DB_RESET: 'RESET_TEST_DATABASE',
        }),
        runner,
      ),
    (error) => error instanceof SafetyError && error.code === 'PRODUCTION_NOT_ALLOWED',
  );
  assert.equal(invocations.length, 0);

  await assert.rejects(
    () =>
      runDatabaseReset(
        safeDbEnv({
          DATABASE_URL: 'mysql://user:password@127.0.0.1:3306/lafileto',
          ALLOW_DB_RESET: '1',
          ALLOW_DB_SEED: '1',
          CONFIRM_DB_RESET: 'RESET_TEST_DATABASE',
        }),
        runner,
      ),
    (error) => error instanceof SafetyError && error.code === 'DATABASE_URL_NAME_NOT_DISPOSABLE',
  );
  assert.equal(invocations.length, 0);
});

test('db reset runs reset before seed only after complete preflight', async () => {
  const invocations = [];
  const safeEnv = safeDbEnv({
    ALLOW_DB_RESET: '1',
    ALLOW_DB_SEED: '1',
    CONFIRM_DB_RESET: 'RESET_TEST_DATABASE',
  });

  await runDatabaseReset(safeEnv, async (command, args) => {
    invocations.push([command, args]);
  });

  assert.deepEqual(invocations, [
    ['pnpm', ['exec', 'prisma', 'migrate', 'reset', '--force', '--skip-seed']],
    ['node', ['prisma/seed.js']],
  ]);

  const resetFailureInvocations = [];
  await assert.rejects(
    () =>
      runDatabaseReset(safeEnv, async (command, args) => {
        resetFailureInvocations.push([command, args]);
        throw new Error('simulated reset failure');
      }),
    /simulated reset failure/,
  );
  assert.equal(resetFailureInvocations.length, 1);
});

test('local and remote smoke modes reject unsafe targets before networking', () => {
  expectSafetyError(
    () =>
      assertSmokeTarget('local', {
        NODE_ENV: 'test',
        API_BASE: 'https://staging.example.test/api/v1',
        ALLOW_LOCAL_SMOKE: '1',
      }),
    'SMOKE_LOCAL_HOST_NOT_ALLOWED',
  );
  expectSafetyError(
    () =>
      assertSmokeTarget('local', { NODE_ENV: 'test', API_BASE: 'http://localhost:3000/api/v1' }),
    'SMOKE_LOCAL_OPT_IN_REQUIRED',
  );
  expectSafetyError(
    () =>
      assertSmokeTarget('remote', {
        NODE_ENV: 'test',
        API_BASE: 'https://staging.example.test/api/v1',
        SMOKE_EXPECTED_HOST: 'staging.example.test',
      }),
    'SMOKE_REMOTE_OPT_IN_REQUIRED',
  );
  expectSafetyError(
    () =>
      assertSmokeTarget('remote', {
        NODE_ENV: 'test',
        API_BASE: 'https://staging.example.test/api/v1',
        ALLOW_REMOTE_SMOKE: '1',
        SMOKE_EXPECTED_HOST: 'other.example.test',
      }),
    'SMOKE_REMOTE_HOST_MISMATCH',
  );
});

test('the command wrapper fails closed before it can spawn an unsafe smoke command', () => {
  const result = spawnSync(
    process.execPath,
    [safetyScriptPath, 'smoke-local', '--', process.execPath, '--eval', 'process.exit(99)'],
    {
      env: { ...process.env, NODE_ENV: 'test' },
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /API_BASE_MISSING/);
});

test('safe fictitious configurations pass without exposing credentials in errors', () => {
  assert.deepEqual(assertDatabaseTestEnvironment(safeDbEnv(), { requireShadow: true }), {
    databaseName: 'lafileto_test',
  });
  assert.deepEqual(
    assertSmokeTarget('local', {
      NODE_ENV: 'test',
      API_BASE: 'http://localhost:3000/api/v1',
      ALLOW_LOCAL_SMOKE: '1',
    }),
    { mode: 'local', host: 'localhost' },
  );

  try {
    assertDatabaseTestEnvironment(
      safeDbEnv({ DATABASE_URL: 'mysql://user:very-secret@db.example.test:3306/lafileto_test' }),
    );
    assert.fail('Expected a safety error');
  } catch (error) {
    assert.equal(error.message.includes('very-secret'), false);
    assert.equal(error.message.includes('db.example.test'), false);
    assert.equal(error.message.includes('mysql://'), false);
  }
});
