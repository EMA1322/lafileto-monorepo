import assert from 'node:assert/strict';

import { replaceHash } from '../src/utils/helpers.js';

function withWindowMock(mockWindow, run) {
  const originalWindow = globalThis.window;
  globalThis.window = mockWindow;
  try {
    run();
  } finally {
    globalThis.window = originalWindow;
  }
}

function testReplaceHashUsesHistoryWhenAvailable() {
  const calls = [];
  const mockWindow = {
    location: {
      hash: '#users',
      pathname: '/admin',
      search: '?env=test',
    },
    history: {
      state: { some: 'state' },
      replaceState(state, _title, nextUrl) {
        calls.push({ state, nextUrl });
      },
    },
  };

  withWindowMock(mockWindow, () => {
    const nextHash = replaceHash('products', 'q=coca&page=2');
    assert.equal(nextHash, '#products?q=coca&page=2');
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    state: { some: 'state' },
    nextUrl: '/admin?env=test#products?q=coca&page=2',
  });
}

function testReplaceHashFallsBackToLocationHash() {
  const mockWindow = {
    location: {
      hash: '#users',
      pathname: '/admin',
      search: '',
    },
    history: {},
  };

  withWindowMock(mockWindow, () => {
    const nextHash = replaceHash('users', 'q=ana');
    assert.equal(nextHash, '#users?q=ana');
    assert.equal(mockWindow.location.hash, '#users?q=ana');
  });
}

export function runHashSyncTests() {
  testReplaceHashUsesHistoryWhenAvailable();
  testReplaceHashFallsBackToLocationHash();
}
