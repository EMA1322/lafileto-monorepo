---
status: Draft
owner: Tech Lead
last_update: 2025-10-10
scope: Revisión final de entornos/puertos/CI-CD; CORS; seeds; backup/restore.
---

# Despliegue

> **Monorepo:** `apps/{client,admin,backend}` + `packages/*`  
> **Build:** Vite (client/admin) + Node/Express (backend) con PNPM.

## 1) Entornos y URLs
| Entorno | Client SPA | Admin SPA | API v1 | Notas |
|---|---|---|---|---|
| **dev (LAN)** | `http://localhost:5173/` | `http://localhost:5174/` | `http://localhost:3000/api/v1` | CORS: `localhost` + IP LAN |
| **staging** | `https://client-stg.example.com` | `https://admin-stg.example.com` | `https://api-stg.example.com/api/v1` | Placeholders |
| **prod** | `https://menu.lafileto.com` | `https://admin.lafileto.com` | `https://api.lafileto.com/api/v1` | Ajustar DNS/SSL/Proxy |

> Variables de entorno en `docs/07-anexos/env.md`.

## 2) Puertos y procesos
- **Client** → Vite `5173`
- **Admin** → Vite `5174`
- **API** → Express `3000`
- **MySQL** → `3306`
- Si un puerto está en uso: `pnpm dlx kill-port 5173 5174 3000`

## 3) Build y artefactos
- **Client/Admin**: `pnpm -F client build` / `pnpm -F admin build` → `apps/*/dist/` (estático).
- **Analizar bundles** (opcional): `pnpm -F client build:analyze` / `pnpm -F admin build:analyze` genera `dist/stats-*.html` con el resumen de chunks.
- **API**: `pnpm -F backend build` (si aplica) y ejecutar con PM2/systemd.
- CI sube artefactos opcionales de `dist/` (ver _CI/CD_).

### Checklist rápido de assets estáticos
- Imágenes en `apps/*/public/img` idealmente < **500 KB**; preferir WebP/AVIF.
- Convertir assets pesados con `pnpm -F client optimize:images` o `pnpm -F admin optimize:images` (usa [sharp](https://sharp.pixelplumbing.com/)).
- El script genera `.webp` y `.avif` manteniendo los `.png/.jpg` originales.
- Usar `--force` si querés regenerar todos los derivados.

## 4) CORS
- En producción, si hay proxy (Nginx/Cloudflare), activar en la app: `app.set('trust proxy', 1)`.
- Definir `CORS_ALLOWLIST` por entorno. Ejemplo (dev):
  ``http://localhost:5174,http://localhost:5173,http://<IP-LAN>:5174``.

### CORS en desarrollo vs LAN
- **Desarrollo local**: Vite (client y admin) proxyan `http://localhost:3000` cuando la request comienza con `/api`. Eso evita el preflight y cualquier error de CORS mientras trabajás en `http://localhost:5173` o `http://localhost:5174`.
- **Pruebas en LAN**: el backend valida `Origin` contra `CORS_ALLOWLIST`. Agregá la IP local (ej.: `http://192.168.1.33:5174`) y reiniciá la API.
- **Validaciones rápidas**:
  ```bash
  # Preflight OPTIONS desde un navegador en LAN
  curl -i -X OPTIONS http://localhost:3000/api/v1/auth/login \
    -H "Origin: http://192.168.1.33:5174" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization"

  # Login real (POST) con el mismo Origin y cookies/headers
  curl -i -X POST http://localhost:3000/api/v1/auth/login \
    -H "Origin: http://192.168.1.33:5174" \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@lafileto.com","password":"123456"}'
  ```
- Si el preflight responde `204` y el POST devuelve `200/401` (según credenciales), la configuración es correcta.

## 5) Migraciones/Seeds
- **Prisma Migrate**. Seeds mínimas: roles/permissions/users y `settings.isOpen=true`.
- Publicar un script de seed reproducible: `pnpm -F backend run seed`.

## 6) Observabilidad (mínimo)
- Logs de acceso/errores (sin datos sensibles). Health check `GET /api/v1/health`.

## 7) Backup/Restore
- **Definir**: política de backup MySQL (frecuencia/retención), cifrado, y restauración probada.

## 8) Estructura y rutas de CI/CD (dónde viven las cosas)
- Workflow: **`.github/workflows/ci.yml`**
- Dueños de código: **`.github/CODEOWNERS`**
- Plantilla de PR: **`.github/PULL_REQUEST_TEMPLATE.md`**
- Documentación CI/CD: **`docs/05-procesos/ci-cd.md`**
- Procesos generales: **`docs/05-procesos/procesos.md`**

## 9) Despliegue manual (temporal)
1. **Build** local o en runner: `pnpm -F client build && pnpm -F admin build`.
2. **Publicar** el contenido de `apps/*/dist/` en el hosting/CDN.
3. **API**: exportar `.env` y levantar con PM2:
   ```bash
   pm2 start apps/backend/src/server.js --name lafileto-api
   pm2 save
   ```

## 10) Roadmap a CD
- Añadir job de **deploy** (staging/prod) con _environments_ y aprobación manual (gates).
- Consolidar secretes en **Actions → Secrets and variables → Actions** por entorno.
