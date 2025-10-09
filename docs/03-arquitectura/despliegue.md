---
status: Draft
owner: Tech Lead
last_update: 2025-10-09
scope: Revisión final de entornos/puertos/CI-CD; CORS; seeds; backup/restore (Pendiente).
---

## 1) Entornos y URLs
| Entorno | Client SPA | Admin SPA | API v1 | Notas |
|---|---|---|---|---|
| **dev (LAN)** | `http://localhost:5173/` | `http://localhost:5174/` | `http://localhost:3000/api/v1` | CORS: localhost + IP LAN |
| **staging** | `https://client-stg.example.com` | `https://admin-stg.example.com` | `https://api-stg.example.com/api/v1` | Placeholders |
| **prod** | `https://menu.lafileto.com` | `https://admin.lafileto.com` | `https://api.lafileto.com/api/v1` | Ajustar DNS/SSL |

> Variables detalladas en [`../07-anexos/env.md`](../07-anexos/env.md).

## 2) Puertos y procesos
- Tip: si un puerto está ocupado, ejecutar `pnpm dlx kill-port 5173 5174 3000` antes de `pnpm dev`.
- **Client**: 5173 (Vite)  
- **Admin**: 5174 (Vite)  
- **API**: 3000 (Express)  
- **DB MySQL**: 3306

## 3) Build y artefactos
- Client/Admin: `pnpm build` → `dist/` estático.  
- API: proceso Node (PM2/systemd).  
- CI/CD con **path filters** por workspace (ver [`../05-procesos/ci-cd.md`](../05-procesos/ci-cd.md)).

## 4) CORS
En producción, si hay proxy inverso (Nginx/Cloudflare), activar `app.set('trust proxy', 1)` para que CORS y rate-limit identifiquen correctamente la IP del cliente.
Definir `CORS_ALLOWLIST` por entorno. Ejemplo (dev):  
`http://localhost:5173,http://localhost:5174,http://<IP-LAN>:5173`

## 5) Migraciones/Seeds
- Prisma Migrate + seeds mínimas: roles/permissions/users y `settings` (`isOpen=true`).  
- Publicar un script de seed reproducible.

## 6) Observabilidad (mínimo)
- Logs de acceso/errores (sin datos sensibles) y métricas básicas.

## 7) Backup/Restore — **Pendiente de completar**
- [ ] Definir estrategia de backup de MySQL (ventana/frecuencia).  
- [ ] Probar restore en entorno aislado.  
- [ ] Documentar retención, ubicación y cifrado de backups.  
