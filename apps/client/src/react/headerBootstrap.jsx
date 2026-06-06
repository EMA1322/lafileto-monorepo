import React from 'react';
import { createRoot } from 'react-dom/client';
import { Header } from './components/Header.jsx';

let root = null;

function ensureHeaderMountNode() {
  const host = document.querySelector("body > header[role='banner']");
  if (!host) return null;

  let mountNode = host.querySelector('[data-react-header-root]');
  if (!mountNode) {
    mountNode = document.createElement('div');
    mountNode.setAttribute('data-react-header-root', 'true');
    host.innerHTML = '';
    host.appendChild(mountNode);
  }

  return mountNode;
}

export function mountReactHeader() {
  const mountNode = ensureHeaderMountNode();
  if (!mountNode) return;

  if (!root) {
    root = createRoot(mountNode);
  }

  root.render(React.createElement(Header));
}

export function unmountReactHeader() {
  if (!root) return;
  root.unmount();
  root = null;
}
