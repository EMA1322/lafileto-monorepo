const stylesheetLoadPromises = new Map();

function normalizeHref(href) {
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return href;
  }
}

function findStylesheetLink(href) {
  const normalizedHref = normalizeHref(href);
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
  return links.find((link) => normalizeHref(link.href) === normalizedHref) || null;
}

function waitForStylesheetLoad(linkEl, href, timeoutMs) {
  if (linkEl.dataset.loaded === 'true' || linkEl.sheet) {
    linkEl.dataset.loaded = 'true';
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let isDone = false;
    const finish = () => {
      if (isDone) return;
      isDone = true;
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(() => {
      console.warn(`Stylesheet load timeout after ${timeoutMs}ms: ${href}`);
      finish();
    }, timeoutMs);

    linkEl.addEventListener('load', () => {
      linkEl.dataset.loaded = 'true';
      finish();
    }, { once: true });

    linkEl.addEventListener('error', () => {
      console.warn(`Stylesheet failed to load: ${href}`);
      finish();
    }, { once: true });
  });
}

export async function ensureStylesheetLoaded(href, opts = {}) {
  if (!href || typeof document === 'undefined') return;

  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 2800;
  const normalizedHref = normalizeHref(href);
  const pendingPromise = stylesheetLoadPromises.get(normalizedHref);
  if (pendingPromise) {
    await pendingPromise;
    return;
  }

  let linkEl = findStylesheetLink(href);
  if (!linkEl) {
    linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = href;
    document.head.appendChild(linkEl);
  } else if (linkEl.rel === 'preload') {
    linkEl.rel = 'stylesheet';
  }

  const loadPromise = waitForStylesheetLoad(linkEl, href, timeoutMs);
  stylesheetLoadPromises.set(normalizedHref, loadPromise);

  try {
    await loadPromise;
  } finally {
    stylesheetLoadPromises.delete(normalizedHref);
  }
}
