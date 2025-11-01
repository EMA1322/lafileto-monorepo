import express from 'express';
import cors from 'cors';

let reloadToken = 0;

function toCsv(allowlist) {
  if (allowlist == null) return '';
  if (Array.isArray(allowlist)) return allowlist.join(',');
  return allowlist;
}

async function reloadModules() {
  const envUrl = new URL('../env.js', import.meta.url);
  envUrl.searchParams.set('reload', String(reloadToken));
  await import(envUrl.href);

  const corsUrl = new URL('../cors.js', import.meta.url);
  corsUrl.searchParams.set('reload', String(reloadToken));
  return import(corsUrl.href);
}

export async function setAllowlistAndReload(allowlist) {
  if (allowlist === undefined) {
    delete process.env.CORS_ALLOWLIST;
  } else {
    process.env.CORS_ALLOWLIST = toCsv(allowlist);
  }

  reloadToken += 1;
  return reloadModules();
}

export async function createCorsTestApp({ allowlist } = {}) {
  const corsModule = await setAllowlistAndReload(allowlist);
  const { buildCorsOptions } = corsModule;

  const options = allowlist === undefined
    ? buildCorsOptions()
    : buildCorsOptions(allowlist);

  const app = express();
  app.use(cors(options));

  app.options('/ping', (_req, res) => {
    res.sendStatus(204);
  });

  app.get('/ping', (_req, res) => {
    res.json({ ok: true });
  });

  app.use((err, _req, res, next) => {
    if (err && /Not allowed by CORS/.test(err.message)) {
      res.status(403).send(err.message);
      return;
    }
    next(err);
  });

  return { app, corsModule };
}
