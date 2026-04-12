// ================================
// main.js — boot del SPA
// ================================

// Estilos globales + estilos por vista
import '/src/styles/global.css';
import '/src/styles/header.css';
import '/src/styles/footer.css';

import { initRouter } from '/src/utils/router.js';
import { initHeader } from '/src/components/header/header.js';
import { initFooter } from '/src/components/footer/footer.js';
import { mountReactShell, unmountReactShell } from '/src/react/bootstrap.jsx';
import { isReactHashRoute, isReactRouteKey } from '/src/react/utils/routing.js';

async function loadFragment(hostSelector, htmlPath) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  try {
    const res = await fetch(htmlPath);
    if (!res.ok) throw new Error(`Fetch ${htmlPath} -> ${res.status}`);
    const html = await res.text();
    host.innerHTML = html;
  } catch (err) {
    console.error(`[main] Error cargando fragmento ${htmlPath}:`, err);
  }
}

async function loadHeader() {
  await loadFragment("body > header[role='banner']", '/src/components/header/header.html');
  initHeader();
}

async function loadFooter() {
  await loadFragment("body > footer[role='contentinfo']", '/src/components/footer/footer.html');
  initFooter();
}

function syncShellByHash() {
  if (isReactHashRoute(window.location.hash || '#home')) {
    mountReactShell('main-content');
    return;
  }

  unmountReactShell();
}

window.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadHeader(), loadFooter()]);

  initRouter({
    shouldHandleRoute: (routeKey) => !isReactRouteKey(routeKey),
  });

  syncShellByHash();
  window.addEventListener('hashchange', syncShellByHash, { passive: true });
});
