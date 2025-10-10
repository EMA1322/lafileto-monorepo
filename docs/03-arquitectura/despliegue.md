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
- **API**: `pnpm -F backend build` (si aplica) y ejecutar con PM2/systemd.
- CI sube artefactos opcionales de `dist/` (ver _CI/CD_).

## 4) CORS
- En producción, si hay proxy (Nginx/Cloudflare), activar en la app: `app.set('trust proxy', 1)`.
- Definir `CORS_ALLOWLIST` por entorno. Ejemplo (dev):  
  ``http://localhost:5173,http://localhost:5174,http://<IP-LAN>:5173``.

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
