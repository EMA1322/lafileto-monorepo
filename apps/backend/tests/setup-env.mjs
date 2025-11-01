import express from 'express';

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

export function createCorsTestApp(middleware) {
  const app = express();

  app.use(middleware);

  app.options('/ping', (req, res) => {
    res.sendStatus(204);
  });

  app.get('/ping', (req, res) => {
    res.json({ ok: true });
  });

  return app;
}
