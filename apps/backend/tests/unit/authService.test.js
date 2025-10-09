import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLockState } from '../../src/services/authService.js';

test('calculateLockState: ok password => reset', () => {
  const user = { failedLoginAttempts: 3 };
  const out = calculateLockState(user, true);
  assert.equal(out.reset, true);
  assert.equal(out.bump, false);
  assert.equal(out.lockUntil, null);
});

test('calculateLockState: failed < MAX => bump sin lock', () => {
  const user = { failedLoginAttempts: 0 };
  const out = calculateLockState(user, false, 0);
  assert.equal(out.reset, false);
  assert.equal(out.bump, true);
  assert.equal(out.lockUntil, null);
  assert.equal(out.failed, 1);
});

test('calculateLockState: failed alcanza MAX => lockUntil seteado', () => {
  const user = { failedLoginAttempts: 9 };
  const out = calculateLockState(user, false, 0);
  assert.equal(out.reset, false);
  assert.equal(out.bump, true);
  assert.ok(out.lockUntil instanceof Date);
});
