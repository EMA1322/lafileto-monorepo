import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCTION_VALUES = new Set(['production', 'prod']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SENSITIVE_OPERATIONS = {
  'migrate-deploy': { flag: 'ALLOW_DB_MIGRATE_DEPLOY' },
  'migrate-reset': { flag: 'ALLOW_DB_RESET', confirmation: 'RESET_TEST_DATABASE' },
  seed: { flag: 'ALLOW_DB_SEED' },
};

export class SafetyError extends Error {
  constructor(code) {
    super(`[db-safety] ${code}`);
    this.name = 'SafetyError';
    this.code = code;
  }
}

function fail(code) {
  throw new SafetyError(code);
}

function value(env, name) {
  return typeof env[name] === 'string' ? env[name].trim() : '';
}

function hasProductionIndicator(env) {
  return ['NODE_ENV', 'APP_ENV', 'DEPLOYMENT_ENV', 'ENVIRONMENT'].some((name) =>
    PRODUCTION_VALUES.has(value(env, name).toLowerCase()),
  );
}

function parseUrl(raw, code) {
  if (!raw) fail(`${code}_MISSING`);

  try {
    const url = new URL(raw);
    if (code !== 'API_BASE' && url.protocol !== 'mysql:') fail(`${code}_INVALID`);
    if ((url.username || url.password) && code === 'API_BASE') fail(`${code}_INVALID`);
    return url;
  } catch {
    fail(`${code}_INVALID`);
  }
}

function normalizeHostname(host) {
  const normalized = host.toLowerCase();
  return normalized === '[::1]' ? '::1' : normalized;
}

function databaseName(url, code) {
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, '')).trim();
  if (!name || name.includes('/')) fail(`${code}_INVALID`);
  return name;
}

function splitAllowlist(raw) {
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isDisposableDatabase(name, env) {
  const explicit = splitAllowlist(value(env, 'DB_TEST_ALLOWED_DATABASES'));
  return (
    explicit.includes(name.toLowerCase()) ||
    /(^|[_-])(test|ci)([_-]|$)/i.test(name) ||
    /(_test|_ci)$/i.test(name)
  );
}

function isAllowedDatabaseHost(host, env) {
  const normalized = normalizeHostname(host);
  return (
    LOOPBACK_HOSTS.has(normalized) ||
    splitAllowlist(value(env, 'DB_TEST_ALLOWED_HOSTS')).includes(normalized)
  );
}

function assertTestNodeEnv(env) {
  if (value(env, 'NODE_ENV') !== 'test' || hasProductionIndicator(env)) {
    fail('NODE_ENV_MUST_BE_TEST');
  }
}

function assertDatabaseTarget(raw, env, code) {
  const url = parseUrl(raw, code);
  if (!isAllowedDatabaseHost(url.hostname, env)) fail(`${code}_HOST_NOT_ALLOWED`);

  const name = databaseName(url, code);
  if (!isDisposableDatabase(name, env)) fail(`${code}_NAME_NOT_DISPOSABLE`);
  return url;
}

export function assertIsolatedTestEnvironment(env = process.env) {
  const nodeEnv = value(env, 'NODE_ENV');
  if (nodeEnv && nodeEnv !== 'test') fail('NODE_ENV_MUST_BE_TEST');
  if (hasProductionIndicator(env)) fail('NODE_ENV_MUST_BE_TEST');
  return { nodeEnv: 'test', prismaStub: true };
}

export function assertDatabaseTestEnvironment(env = process.env, { requireShadow = false } = {}) {
  assertTestNodeEnv(env);
  if (value(env, 'ALLOW_DB_TESTS') !== '1') fail('DB_TEST_OPT_IN_REQUIRED');

  const databaseUrl = value(env, 'DATABASE_URL');
  const primary = assertDatabaseTarget(databaseUrl, env, 'DATABASE_URL');
  const shadowUrl = value(env, 'SHADOW_DATABASE_URL');

  if (requireShadow && !shadowUrl) fail('SHADOW_DATABASE_URL_MISSING');
  if (shadowUrl) {
    const shadow = assertDatabaseTarget(shadowUrl, env, 'SHADOW_DATABASE_URL');
    if (primary.href === shadow.href) fail('DATABASE_AND_SHADOW_MUST_DIFFER');
  }

  return { databaseName: databaseName(primary, 'DATABASE_URL') };
}

export function assertSensitiveDatabaseOperation(operation, env = process.env) {
  const requirements = SENSITIVE_OPERATIONS[operation];
  if (!requirements) fail('OPERATION_NOT_RECOGNIZED');
  if (hasProductionIndicator(env)) fail('PRODUCTION_NOT_ALLOWED');
  assertDatabaseTestEnvironment(env);
  if (value(env, requirements.flag) !== '1') fail('OPERATION_OPT_IN_REQUIRED');
  if (requirements.confirmation && value(env, 'CONFIRM_DB_RESET') !== requirements.confirmation) {
    fail('RESET_CONFIRMATION_REQUIRED');
  }
}

export function assertSmokeTarget(mode, env = process.env) {
  if (mode !== 'local' && mode !== 'remote') fail('SMOKE_MODE_NOT_RECOGNIZED');
  if (hasProductionIndicator(env)) fail('PRODUCTION_NOT_ALLOWED');

  const url = parseUrl(value(env, 'API_BASE'), 'API_BASE');
  if (url.protocol !== 'http:' && url.protocol !== 'https:') fail('API_BASE_INVALID');
  if (!url.pathname.startsWith('/api/v1')) fail('API_BASE_INVALID');

  const host = normalizeHostname(url.hostname);
  if (mode === 'local') {
    if (!LOOPBACK_HOSTS.has(host)) fail('SMOKE_LOCAL_HOST_NOT_ALLOWED');
    if (value(env, 'ALLOW_LOCAL_SMOKE') !== '1') fail('SMOKE_LOCAL_OPT_IN_REQUIRED');
  } else {
    if (LOOPBACK_HOSTS.has(host)) fail('SMOKE_REMOTE_HOST_NOT_ALLOWED');
    if (url.protocol !== 'https:') fail('SMOKE_REMOTE_HTTPS_REQUIRED');
    if (value(env, 'ALLOW_REMOTE_SMOKE') !== '1') fail('SMOKE_REMOTE_OPT_IN_REQUIRED');
    const expectedHost = normalizeHostname(value(env, 'SMOKE_EXPECTED_HOST'));
    if (!expectedHost || host !== expectedHost) {
      fail('SMOKE_REMOTE_HOST_MISMATCH');
    }
  }

  return { mode, host };
}

function runCommand(command, args, env) {
  const child = spawn(command, args, { stdio: 'inherit', env });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 0;
  });
}

function runCommandAndWait(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error('Secure command terminated unexpectedly.'));
      } else if (code === 0) {
        resolve();
      } else {
        reject(new Error('Secure command failed.'));
      }
    });
  });
}

export async function runDatabaseReset(env = process.env, commandRunner = null) {
  assertSensitiveDatabaseOperation('migrate-reset', env);
  assertSensitiveDatabaseOperation('seed', env);

  const run = commandRunner ?? ((command, args) => runCommandAndWait(command, args, env));
  await run('pnpm', ['exec', 'prisma', 'migrate', 'reset', '--force', '--skip-seed']);
  await run('node', ['prisma/seed.js']);
}

async function runCli() {
  const [operation, separator, command, ...args] = process.argv.slice(2);
  if (operation === 'reset' && !separator && !command) {
    await runDatabaseReset();
    return;
  }

  if (!operation || separator !== '--' || !command) fail('COMMAND_REQUIRED');

  if (operation === 'smoke-local' || operation === 'smoke-remote') {
    const mode = operation === 'smoke-local' ? 'local' : 'remote';
    assertSmokeTarget(mode);
    runCommand(command, args, { ...process.env, SMOKE_MODE: mode });
    return;
  }

  assertSensitiveDatabaseOperation(operation);
  runCommand(command, args, process.env);
}

const invokedAsScript =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedAsScript) {
  void runCli().catch((error) => {
    const code = error instanceof SafetyError ? error.code : 'VALIDATION_FAILED';
    console.error(`[db-safety] ${code}`);
    process.exitCode = 1;
  });
}
