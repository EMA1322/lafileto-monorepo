---
status: CANONICAL
verified_at: 2026-08-07
---

# Seguridad operativa actual

## Controles incorporados

- **SEC-01:** saneamiento de credenciales rastreadas y eliminación de fallbacks inseguros de tip.
- **SEC-02:** alineación de contratos de entorno entre Client, Admin, Backend y Prisma.
- **SEC-03:** guardas fail-closed para DB tests, migraciones, seed, reset y smokes; la CI normal evita DB real.
- **SEC-04:** escaneo de secretos local y en CI mediante Gitleaks, con validación de alcance Git disponible.

Backend usa JWT para endpoints protegidos, RBAC por módulo/operación, validación de entrada, envelope consistente y Prisma para acceso a MySQL. La configuración CORS y los orígenes de desarrollo están definidos en código/configuración; no abrir orígenes para resolver fallas sin revisar el contrato.

El limitador de autenticación vigente es de **10 intentos por 15 minutos**; una referencia a 5/min sería incorrecta.

## Secret scanning

`pnpm secrets:scan` usa la versión de Gitleaks fijada por el script. Ejecutarlo antes de commits relevantes, entendiendo que el rango `merge-base..HEAD` puede ser vacío y que staging necesita cobertura específica. El workflow de GitHub protege push/PR con el rango que GitHub expone.

Secret Scanning y Push Protection de GitHub son controles externos: pueden estar habilitados en la plataforma, pero su configuración no es verificable solo desde este repositorio. No documentar su estado como evidencia versionada sin una fuente de GitHub autorizada.

No exponer valores, fragmentos ni longitudes de secretos en documentación o reportes.
