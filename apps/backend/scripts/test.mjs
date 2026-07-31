import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertDatabaseTestEnvironment,
  assertIsolatedTestEnvironment,
  SafetyError,
} from './db-safety.mjs';

const databaseMode = process.argv.includes('--db');

try {
  if (databaseMode) {
    assertDatabaseTestEnvironment(process.env);
    process.env.PRISMA_CLIENT_STUB = '0';
  } else {
    assertIsolatedTestEnvironment(process.env);
    process.env.PRISMA_CLIENT_STUB = '1';
  }
} catch (error) {
  const code = error instanceof SafetyError ? error.code : 'VALIDATION_FAILED';
  console.error(`[test] ${code}`);
  process.exit(1);
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const isolatedTestFiles = [
  resolve(projectRoot, 'tests/integration/categories.api.test.mjs'),
  resolve(projectRoot, 'tests/integration/categories.rbac.test.mjs'),
  resolve(projectRoot, 'tests/integration/users.api.test.mjs'),
  resolve(projectRoot, 'tests/integration/settings.service.test.mjs'),
  resolve(projectRoot, 'tests/integration/settings.routes.test.mjs'),
  resolve(projectRoot, 'tests/integration/siteConfig.validation.test.mjs'),
  resolve(projectRoot, 'tests/scripts/db-safety.test.mjs'),
];

const databaseTestFiles = [
  resolve(projectRoot, 'tests/integration/auth.int.test.js'),
  resolve(projectRoot, 'tests/integration/rbac.int.test.js'),
];

const testFiles = databaseMode ? databaseTestFiles : isolatedTestFiles;

const child = spawn(process.execPath, ['--test', ...testFiles], {
  cwd: projectRoot,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 0;
});
