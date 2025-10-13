# Debug login /api/v1/auth/login (Abril 2025)

## Contexto
- Reporte: POST `/api/v1/auth/login` quedaba colgado sin respuesta visible en Admin ni en Postman.
- Backend operativo, pero la promesa no se resolvía → spinner infinito en UI.

## Diagnóstico
1. Instrumentamos el controlador con `X-Request-Id` y logs temporales (`[auth.login] start/success/error`).
2. Observamos que los requests quedaban abiertos más de 15 s cuando Prisma no lograba obtener conexión MySQL (socket en espera).
3. Al no existir timeout a nivel Express, la request seguía abierta indefinidamente, dejando al cliente esperando.
4. Para Postman detectamos además envíos `x-www-form-urlencoded` que no eran parseados (solo aceptábamos JSON).

## Hotfix aplicado (seguro y reversible)
- Middleware `requestTimeout` que corta la request con `REQUEST_TIMEOUT (504)` tras `REQUEST_TIMEOUT_MS` (default 15 s) y registra un log `// TODO: remove debug log` para seguimiento.
- Aceptamos `application/x-www-form-urlencoded` (además de JSON) para el login sin modificar contratos.
- Logs temporales en `authController.login` para ver inicio/fin/errores con `requestId`.
- Endpoint rápido `GET /api/v1/_debug/ping` para validar que el backend responde incluso cuando la base está caída.

## Validación
- `curl -i -X OPTIONS http://localhost:3000/api/v1/auth/login` → 204 con headers CORS.
- `curl -i -H "content-type: application/json" -d '{"email":"admin@lafileto.ar","password":"ChangeMe!2025"}' http://localhost:3000/api/v1/auth/login` → 200 (token) o 401 con envelope claro.
- `curl -i http://localhost:3000/api/v1/_debug/ping` → 200 `{ ok: true, data: { ts: ... } }`.
- `pnpm -F admin build` y `pnpm -F client build` continúan en verde.

> Nota: todos los logs marcados con `// TODO: remove debug log` deben eliminarse cuando el monitoreo confirme estabilidad.
