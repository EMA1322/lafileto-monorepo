const ensureEnv = (key, value) => {
  if (Object.prototype.hasOwnProperty.call(process.env, key)) {
    return;
  }
  process.env[key] = value;
};

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

ensureEnv('JWT_SECRET', 'test-secret');
ensureEnv('PORT', '3000');
ensureEnv('REQUEST_TIMEOUT_MS', '15000');
ensureEnv('CORS_ALLOWLIST', 'http://localhost:5173,http://localhost:5174');
