import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const testFiles = [
  resolve(projectRoot, 'tests/integration/categories.api.test.mjs'),
  resolve(projectRoot, 'tests/integration/categories.rbac.test.mjs'),
  resolve(projectRoot, 'tests/integration/users.api.test.mjs'),
];

const child = spawn(process.execPath, ['--test', ...testFiles], {
  cwd: projectRoot,
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 0;
});
