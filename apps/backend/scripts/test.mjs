import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('../tests/setup-env.mjs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const testFiles = [
  resolve(projectRoot, 'src/config/__tests__/cors.test.js'),
  resolve(projectRoot, 'tests/integration/categories.api.test.mjs'),
  resolve(projectRoot, 'tests/integration/categories.rbac.test.mjs'),
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
