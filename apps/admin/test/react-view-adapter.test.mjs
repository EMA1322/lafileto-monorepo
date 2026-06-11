import assert from 'node:assert/strict';

import {
  __setCreateRootFactoryForTests,
  hasActiveReactView,
  mountReactView,
  unmountReactView,
} from '../src/utils/reactViewAdapter.js';

function createRootFactoryMock(records) {
  return (container) => {
    const record = {
      container,
      rendered: [],
      unmountCount: 0,
    };
    records.push(record);

    return {
      render(element) {
        record.rendered.push(element);
      },
      unmount() {
        record.unmountCount += 1;
      },
    };
  };
}

function SmokeComponent({ label }) {
  return label;
}

function resetAdapter(factory) {
  unmountReactView();
  __setCreateRootFactoryForTests(factory);
}

function testMountsReactComponent() {
  const records = [];
  resetAdapter(createRootFactoryMock(records));

  const container = { id: 'mount-a' };
  mountReactView({
    container,
    component: SmokeComponent,
    props: { label: 'ready' },
  });

  assert.equal(hasActiveReactView(), true);
  assert.equal(records.length, 1);
  assert.equal(records[0].container, container);
  assert.equal(records[0].rendered.length, 1);
  assert.equal(records[0].rendered[0].type, SmokeComponent);
  assert.equal(records[0].rendered[0].props.label, 'ready');
}

function testUnmountsActiveRoot() {
  const records = [];
  resetAdapter(createRootFactoryMock(records));

  mountReactView({
    container: { id: 'mount-b' },
    component: SmokeComponent,
  });

  assert.equal(unmountReactView(), true);
  assert.equal(hasActiveReactView(), false);
  assert.equal(records[0].unmountCount, 1);
  assert.equal(unmountReactView(), false);
}

function testRemountUnmountsPreviousRoot() {
  const records = [];
  resetAdapter(createRootFactoryMock(records));

  mountReactView({
    container: { id: 'mount-c' },
    component: SmokeComponent,
  });
  mountReactView({
    container: { id: 'mount-d' },
    component: SmokeComponent,
    props: { label: 'second' },
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].unmountCount, 1);
  assert.equal(records[1].unmountCount, 0);
  assert.equal(records[1].rendered[0].props.label, 'second');
  assert.equal(hasActiveReactView(), true);
}

function testRequiresMountInputs() {
  const records = [];
  resetAdapter(createRootFactoryMock(records));

  assert.throws(() => mountReactView({ component: SmokeComponent }), /container is required/);
  assert.throws(() => mountReactView({ container: {} }), /component is required/);
  assert.equal(records.length, 0);
  assert.equal(hasActiveReactView(), false);
}

export function runReactViewAdapterTests() {
  testMountsReactComponent();
  testUnmountsActiveRoot();
  testRemountUnmountsPreviousRoot();
  testRequiresMountInputs();
  resetAdapter();
}
