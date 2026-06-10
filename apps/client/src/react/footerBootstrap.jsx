import React from 'react';
import { createRoot } from 'react-dom/client';
import { Footer } from './components/Footer.jsx';

let root = null;

function ensureFooterMountNode() {
  const host = document.querySelector("body > footer[role='contentinfo']");
  if (!host) return null;

  let mountNode = host.querySelector('[data-react-footer-root]');
  if (!mountNode) {
    mountNode = document.createElement('div');
    mountNode.setAttribute('data-react-footer-root', 'true');
    host.innerHTML = '';
    host.appendChild(mountNode);
  }

  return mountNode;
}

export function mountReactFooter() {
  const mountNode = ensureFooterMountNode();
  if (!mountNode) return;

  if (!root) {
    root = createRoot(mountNode);
  }

  root.render(React.createElement(Footer));
}

export function unmountReactFooter() {
  if (!root) return;
  root.unmount();
  root = null;
}
