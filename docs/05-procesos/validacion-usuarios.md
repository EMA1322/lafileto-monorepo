---
status: Stable
owner: QA + Producto
last_update: 2025-11-18
scope: Checklist funcional del módulo Usuarios + Roles & Permisos.
---

## Preparación

1. Backend levantado: `pnpm -F backend dev` (API en `http://localhost:3000`).
2. Admin levantado: `pnpm -F admin dev` (SPA en `http://localhost:5174`).
3. Base de datos con al menos un usuario admin (`admin@lafileto.ar`).
4. Navegador limpio (sin tokens previos) o modo incógnito.

## Checklist funcional

### 1. Inicio de sesión y bootstrap
- Login con credenciales de admin.
- Confirmar que la SPA navega a `/#/dashboard` (o a la primera ruta con permiso `R`).
- Verificar en la consola de red que se ejecuta `GET /api/v1/auth/me` y responde `{ user, permissions }`.

### 2. Gestión de usuarios
- Abrir `/#/users` y confirmar que la tabla renderiza con estilos del UI kit (card + tabla con headers interactivos).
- Probar el ordenamiento por columnas (Nombre, Email, Rol, Estado) y que la paginación interna (10 filas) mantenga el resultado.
- Crear un usuario nuevo con teléfono válido (7–20 caracteres, dígitos o símbolos `()+-`). Deben mostrarse mensajes inline en rojo ante errores y toast verde en éxito.
- Editar un usuario existente (sin cambiar contraseña) y validar que los cambios persisten al refrescar.
- Cambiar el estado con el switch UI kit: el backend debe devolver `{ ok:true, data:{ ... status } }` y la UI reflejarlo.
- Intentar eliminar el usuario logueado → toast con `SELF_DELETE_FORBIDDEN`.
- Intentar eliminar al último admin → toast con `LAST_ADMIN_FORBIDDEN`.
- Eliminar un usuario común y confirmar que desaparece de la grilla.

### 3. Roles & Permisos
- Crear un rol nuevo (ej. `role-cocinero`) y completar la matriz `r/w/u/d`.
- Editar el nombre del rol y guardar; toasts verdes en éxito.
- Intentar eliminar un rol asignado a un usuario → toast "ROLE_IN_USE".
- Eliminar un rol sin usuarios asociados → la fila se remueve.
- Si se edita el rol actual, comprobar que la barra superior refresca permisos (llamado a `auth/me`).

### 4. Navegación protegida
- Cambiar al nuevo usuario creado con permisos limitados.
- Verificar que la SPA redirige a la primera ruta con permiso de lectura y bloquea las otras con "No autorizado".
- Desde la pantalla "No autorizado", el botón "Volver al inicio de sesión" debe ejecutar `logout()` y volver a `/#/login`.
- Simular token inválido (borrar de localStorage y refrescar) → el interceptor de `apiClient` debe disparar `logout()`.

### 5. Logout
- Desde cualquier vista protegida, presionar "Cerrar sesión".
- Confirmar que se realiza `POST /api/v1/auth/logout`, se limpia localStorage y se redirige a `/#/login`.
- Reintentar acceder a rutas protegidas sin token → guard redirige a login.

## Consideraciones

- El teléfono del usuario es obligatorio en base de datos y en la UI.
- Los formularios usan validación compartida (`utils/validation.js`) y muestran errores inline más toast rojo ante fallos.
- Las acciones críticas (crear/editar/eliminar) deben usar modales del UI kit (`openModal`) y toasts (`showToast`).
- Todas las respuestas del backend siguen `{ ok, data | error }` y códigos HTTP adecuados (200/201/204, 4xx, 5xx).
- `/_debug/ping` responde tanto directo (`http://localhost:3000/_debug/ping`) como por proxy (`http://localhost:5174/api/_debug/ping`).
