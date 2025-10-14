# Debug login Admin (Mayo 2025)

## Setup local (Windows 11 + PowerShell)

```powershell
pnpm install
pnpm -F backend prisma:generate
pnpm -F backend prisma:migrate:deploy
pnpm -F backend db:seed
pnpm dev
```

- Backend queda en `http://localhost:3000` y Admin en `http://localhost:5174` (proxy `/api` → backend).
- El seed es idempotente (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULLNAME` viven en `apps/backend/.env`).
- El comando `pnpm dev` levanta ambos procesos (Vite + Express con Nodemon).

## Checklist rápido de diagnóstico

1. **Ping vía proxy:**
   ```bash
   curl -i http://localhost:5174/api/v1/_debug/ping
   curl -i http://localhost:3000/api/v1/_debug/ping
   ```
   - Ambos deben responder `200` con `{ ok: true, ts: ... }`. El endpoint sólo está activo en dev.
2. **Revisar `.env` y proxy:**
   - `apps/backend/.env` → `PORT=3000`, credenciales MySQL, `JWT_SECRET`, `ADMIN_*`.
   - Admin usa `VITE_API_BASE=/api`; verificar en consola (dev) el log `[auth] API_BASE resolved`.
3. **Login con credenciales inválidas:**
   ```bash
   curl -i -X POST http://localhost:5174/api/v1/auth/login \
     -H "Content-Type: application/json" \
     --data '{"email":"no@ex.com","password":"x"}'
   ```
   - Esperado: `401`, envelope `{ ok:false, error:{ code:"AUTH_INVALID", ... } }` y snackbar en Admin.
4. **Network tab (Chrome/Edge):**
   - Confirmar que el request a `/api/v1/auth/login` sale, recibe respuesta y el spinner corta (login.js hace `finally`).
   - Ante 401/403/422/429/500, `apiFetch` muestra mensaje legible y limpia el token.
5. **Alt+Shift+P (debug ping):**
   - Sólo en dev. Dispara `GET /_debug/ping` y muestra snackbar con resultado.

## Qué estaba mal
- El front resolvía `API_BASE` agregando siempre `/api/v1`, incluso cuando `VITE_API_BASE` ya apuntaba a `/api`. Eso terminaba generando rutas como `/api/api/v1/auth/login`, que nunca alcanzaban el endpoint correcto y el login quedaba sin respuesta visible.
- No había trazas suficientes en el front/back para confirmar si la request llegaba ni para ver encabezados/body, complicando el diagnóstico.

## Qué se tocó (mayo 2025)
- Normalizamos `API_BASE` respetando prefijos relativos y dejamos logs sólo en dev (`import.meta.env.DEV`).
- `apiFetch` ahora centraliza toasts para 401/403/408/422/429/500 y limpia el token si el backend responde `AUTH_*`.
- Instrumentamos `POST /api/v1/auth/login` en el backend, dejamos `_debug/ping` sólo para dev y alineamos códigos en `errors.js` + `errorHandler.js`.

## Cómo probar rápido (CLI)
```bash
curl -i http://localhost:5174/api/v1/_debug/ping
curl -i http://localhost:3000/api/v1/_debug/ping
curl -i -X POST http://localhost:5174/api/v1/auth/login \
  -H "Content-Type: application/json" \
  --data '{"email":"admin@lafileto.ar","password":"ChangeMe!2025"}'
```
> Primer request debe devolver 200, segundo 200 directo al backend, tercero 200 si la DB está seeded o 401 con envelope claro.

---

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
