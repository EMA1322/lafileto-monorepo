import React from 'react';
import { createRoot } from 'react-dom/client';

let activeRoot = null;
let activeContainer = null;
let createRootFactory = createRoot;

function assertMountTarget(container, component) {
  if (!container || typeof container !== 'object') {
    throw new TypeError('[reactViewAdapter] container is required.');
  }

  if (!component) {
    throw new TypeError('[reactViewAdapter] component is required.');
  }
}

function createReactElement(component, props) {
  if (React.isValidElement(component)) return component;
  return React.createElement(component, props || {});
}

export function mountReactView({ container, component, props = {} } = {}) {
  assertMountTarget(container, component);
  unmountReactView();

  const root = createRootFactory(container);
  root.render(createReactElement(component, props));

  activeRoot = root;
  activeContainer = container;

  return root;
}

export function unmountReactView() {
  if (!activeRoot) return false;

  activeRoot.unmount();
  activeRoot = null;
  activeContainer = null;

  return true;
}

export function hasActiveReactView() {
  return Boolean(activeRoot && activeContainer);
}

export function __setCreateRootFactoryForTests(factory) {
  createRootFactory = typeof factory === 'function' ? factory : createRoot;
  activeRoot = null;
  activeContainer = null;
}
