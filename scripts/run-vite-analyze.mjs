#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const args = process.argv.slice(2);

const child = spawn('pnpm', ['exec', 'vite', 'build', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ANALYZE_BUNDLE: 'true',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
