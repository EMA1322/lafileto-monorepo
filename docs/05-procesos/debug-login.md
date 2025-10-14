# Debug login Admin (Mayo 2025)

## Qué estaba mal
- El front resolvía `API_BASE` agregando siempre `/api/v1`, incluso cuando `VITE_API_BASE` ya apuntaba a `/api`. Eso terminaba generando rutas como `/api/api/v1/auth/login`, que nunca alcanzaban el endpoint correcto y el login quedaba sin respuesta visible.
- No había trazas suficientes en el front/back para confirmar si la request llegaba ni para ver encabezados/body, complicando el diagnóstico.

## Qué se tocó
- Normalicé `API_BASE` para respetar prefijos relativos y añadí trazas temporales en `apiFetch` y en el submit de login (incluye ping oculto via `Alt+Shift+P`).
- Instrumenté `POST /api/v1/auth/login` en el backend, agregué el endpoint `GET /api/v1/_debug/ping`, extendí los códigos de error (incluido `REQUEST_TIMEOUT`=408) y mejoré el handler global.
- Dejé comentarios `// DEBUG:` y TODO en cada pieza temporal para facilitarnos limpiarlos luego.

## Cómo probar rápido
1. **Proxy:**
   ```bash
   curl -i http://localhost:5174/api/v1/_debug/ping
   curl -i http://localhost:3000/api/v1/_debug/ping
   ```
2. **Login:**
   ```bash
   curl -i -X POST http://localhost:5174/api/v1/auth/login \
     -H "Content-Type: application/json" \
     --data '{"email":"no@ex.com","password":"x"}'
   ```
   > Debería devolver 401 con JSON y loggear en backend.
3. **Front:**
   - Abrir http://localhost:5174, probar login real.
   - Usar `Alt+Shift+P` (o el botón oculto) para disparar el ping y verificar en consola/snackbar.

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
