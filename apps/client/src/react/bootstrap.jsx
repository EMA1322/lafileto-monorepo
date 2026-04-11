import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';

let root = null;

function ensureMountNode(hostId) {
  const host = document.getElementById(hostId);
  if (!host) return null;

  let mountNode = host.querySelector('[data-react-shell-root]');
  if (!mountNode) {
    mountNode = document.createElement('div');
    mountNode.setAttribute('data-react-shell-root', 'true');
    host.innerHTML = '';
    host.appendChild(mountNode);
  }

  return mountNode;
}

export function mountReactShell(hostId = 'main-content') {
  const mountNode = ensureMountNode(hostId);
  if (!mountNode) return;

  if (!root) {
    root = createRoot(mountNode);
  }

  root.render(<App />);
}

export function unmountReactShell() {
  if (!root) return;
  root.unmount();
  root = null;
}
