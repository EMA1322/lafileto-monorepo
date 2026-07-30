---
status: Draft
owner: Tech Lead
last_update: 2026-04-13
scope: Variables por app y ejemplos por entorno.
---

## Backend runtime (Express)

```
PORT=3000
JWT_SECRET=replace-with-a-long-random-secret
CORS_ALLOWLIST=http://localhost:5173,http://localhost:5174
BODY_LIMIT=1mb
REQUEST_TIMEOUT_MS=15000
```

- `PORT` define el puerto HTTP del backend.
- `CORS_ALLOWLIST` debe incluir las URLs del Client/Admin (separadas por coma).
- `REQUEST_TIMEOUT_MS` se usa en el middleware `requestTimeout`.

## Backend database (Prisma)

```
DATABASE_URL=mysql://user:replace-with-local-password@localhost:3306/lafileto_example
# Sólo para prisma migrate dev; usar una base descartable separada.
# SHADOW_DATABASE_URL=mysql://user:replace-with-local-password@localhost:3306/lafileto_shadow_example
```

`DATABASE_URL` es requerida por Prisma, migraciones, seed y CI.
`SHADOW_DATABASE_URL` sólo corresponde a flujos locales de `prisma migrate dev`.

## Backend seed, test y CI

```
ADMIN_EMAIL=
ADMIN_FULLNAME="La Fileto Admin"
ADMIN_PASSWORD=
ADMIN_PHONE=
```

- El seed requiere `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- `ADMIN_FULLNAME` y `ADMIN_PHONE` son overrides opcionales del seed.
- Los tests inyectan sus propios defaults; no requieren un `.env` de test compartido.
- CI provee su propia base efímera y credenciales de seed.

## Build del Client (SPA pública)

```
# Opcional: override explícito de base API.
VITE_API_BASE_URL=/api/v1
```

- Si `VITE_API_BASE_URL` no se define, el client usa `/api/v1` por defecto.
- En desarrollo, `client -> /api/v1/public/* -> Vite proxy -> backend`.
- Para acceso directo al backend desde una IP LAN, configurar `CORS_ALLOWLIST` según corresponda.
- El client público productivo consume API pública; no usar JSON local como fuente productiva.

## Build y desarrollo del Admin (SPA de gestión)

```
VITE_API_BASE=/api
VITE_API_PROXY_TARGET=http://localhost:3000
VITE_DATA_SOURCE=api
VITE_FEATURE_SETTINGS=false
```

- `VITE_API_PROXY_TARGET` configura el destino del proxy de Vite sólo en desarrollo.
- Todo el tráfico de la Admin pasa por el proxy configurado en `vite.config.js`.
- El login y el bootstrap de permisos utilizan `POST /api/v1/auth/login` y `GET /api/v1/auth/me`.
- `VITE_DATA_SOURCE` en admin se conserva para compatibilidad de debug/migración incremental; valor recomendado: `api`.
- `VITE_FEATURE_SETTINGS` habilita Settings sólo cuando resuelve a un valor verdadero.

## Variable interna de build

`ANALYZE_BUNDLE` pertenece a los scripts `build:analyze` y no forma parte del
contrato público de los `.env.example`.

> En producción mover secretos a un gestor seguro; no commitear `.env` reales.
