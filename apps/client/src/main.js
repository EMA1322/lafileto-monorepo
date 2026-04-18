import '/src/styles/global.css';
import '/src/styles/tokens.css';
import '/src/styles/header.css';
import '/src/styles/footer.css';

import { initHeader } from '/src/components/header/header.js';
import { initFooter } from '/src/components/footer/footer.js';
import { mountReactShell } from '/src/react/bootstrap.jsx';

async function loadFragment(hostSelector, htmlPath) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  try {
    const res = await fetch(htmlPath);
    if (!res.ok) throw new Error(`Fetch ${htmlPath} -> ${res.status}`);
    const html = await res.text();
    host.innerHTML = html;
  } catch (err) {
    console.error(`[main] Error loading fragment ${htmlPath}:`, err);
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

window.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadHeader(), loadFooter()]);
  mountReactShell('main-content');
});
