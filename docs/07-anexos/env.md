---
status: Draft
owner: Tech Lead
last_update: 2025-10-09
scope: Variables por app y ejemplos por entorno.
---

## Backend
```
PORT=3000
DATABASE_URL=mysql://user:pass@localhost:3306/lafileto
JWT_SECRET=changeme
CORS_ALLOWLIST=http://localhost:5173,http://localhost:5174
BODY_LIMIT=1mb
REQUEST_TIMEOUT_MS=15000
```

## Client (Vite)
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_DATA_SOURCE=json
```

## Admin (Vite)
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_DATA_SOURCE=api
```

> En producción mover secretos a gestor seguro; no commitear `.env` reales.
