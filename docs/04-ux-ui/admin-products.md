---
status: CURRENT
verified_at: 2026-08-07
---

# Admin — Productos

La superficie actual de productos se renderiza desde la página React de Admin y usa el adaptador de API protegido. Las operaciones de listado, alta, edición y cambios de estado dependen de JWT y RBAC del módulo `products`.

El cambio de estado usa la ruta `PATCH /api/v1/products/:id/status` con el permiso de actualización (`products:u`) en el backend actual. Aunque el modelo de permisos conserva `changeStatus`, no debe documentarse ni implementarse como guard de esta ruta sin una decisión y cambio de contrato explícitos.

La UI debe conservar sus estados de carga, vacío, error y permisos denegados, y verificar con el flujo real de Admin después de cualquier modificación de API o permisos.
