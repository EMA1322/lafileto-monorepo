---
status: Draft
owner: Tech Lead
last_update: 2026-04-13
scope: Variables por app y ejemplos por entorno.
---

## Backend (Express + Prisma)
```
PORT=3000
DATABASE_URL=mysql://user:pass@localhost:3306/lafileto
JWT_SECRET=changeme
CORS_ALLOWLIST=http://localhost:5173,http://localhost:5174
BODY_LIMIT=1mb
REQUEST_TIMEOUT_MS=15000
```

- `PORT` define el puerto HTTP del backend.
- `CORS_ALLOWLIST` debe incluir las URLs del Client/Admin (separadas por coma).
- `REQUEST_TIMEOUT_MS` se usa en el middleware `requestTimeout`.

## Client (SPA pública)
```
# Opcional: override explícito de base API.
VITE_API_BASE_URL=/api/v1
```

- `VITE_API_BASE_URL` es opcional. Si no se define, el client usa por defecto `/api/v1` para aprovechar el proxy de Vite en desarrollo.
- El client público productivo consume API pública; no usar JSON local como fuente productiva.

## Admin (SPA de gestión)
```
VITE_API_BASE=/api
VITE_DATA_SOURCE=api
```

- Todo el tráfico de la Admin pasa por el proxy configurado en `vite.config.js`.
- El login y el bootstrap de permisos utilizan `POST /api/v1/auth/login` y `GET /api/v1/auth/me`.
- `VITE_DATA_SOURCE` en admin se conserva para compatibilidad de debug/migración incremental; valor recomendado: `api`.


> En producción mover secretos a un gestor seguro; no commitear `.env` reales.
