---
status: Draft
owner: Backend Lead
last_update: 2025-10-09
scope: JWT+RBAC Admin, CORS allowlist, rate-limit, secretos y mínimos.
---

- **JWT** sólo Admin; Client sin auth.
- **RBAC** por módulo/acción (`users`, `roles`, `permissions`, `categories`, `products`, `settings`).
- **CORS**: allowlist por entorno (localhost y IP LAN en dev).
- **Rate-limit** en `/auth/login` (p.ej., 5/min/IP → 429).
- Secretos en `.env`/gestor; no exponer tokens ni PII en logs.

- **Helmet** para cabeceras seguras y **morgan** para logs de acceso.
- Activar `trust proxy` en producción si hay Nginx/Cloudflare.