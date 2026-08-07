---
status: CANONICAL
verified_at: 2026-08-07
scope: Arquitectura actual productiva de apps/admin.
---

# Arquitectura actual del Admin React

## Status and authority

Este documento describe el Admin actual. El código, configuración y tests ejecutados por su runner son evidencia primaria del comportamiento. Los documentos de evaluación y baseline anteriores son históricos.

## Runtime chain

`index.html → src/main.js → initRouter() → custom hash router → reactViewAdapter → React page`

`main.js` carga estilos base, inicializa modales globales y arranca el router. El router evalúa hash, autenticación, RBAC y feature flags antes de montar una página React. No se usa React Router.

## Routing and React surfaces

Las rutas productivas React son `#login`, `#dashboard`, `#products`, `#categories`, `#users` y `#settings`. El header se monta en React para rutas protegidas. Products incluye gestión de Offers; no existe una ruta `#offers` independiente.

## Transitional and legacy surfaces

`#not-authorized` continúa cargando `src/components/no-access.html` y `src/styles/no-access.css`. Persisten utilidades DOM/globales para modales, toasts, RBAC y renderizado legado; no representan una segunda arquitectura productiva de páginas.

## Authentication and authorization

El router es dueño de guards y navegación. Auth conserva el token `auth_token`, hidrata usuario/permisos mediante `/auth/me` y coordina almacenamiento de sesión. RBAC usa permisos efectivos recibidos del backend y controla lectura/acciones; Users, Roles y Modules requieren `role-admin` en el runtime backend.

## API integration

Admin consume contratos protegidos `/api/v1` mediante sus utilidades de API. Ver [endpoints](../06-apis/endpoints.md); no duplicar contratos de payload aquí.

## Testing

`pnpm -F admin test` ejecuta el runner explícito de Products, Dashboard, Login, Categories, Users/Roles, Settings, Header, adapter, hash sync y UI foundation. `test/rbac.integration.test.js` existe, pero no forma parte de ese runner. Ver [testing](../05-procesos/testing.md).

## Protected contracts

- Router hash propio y su ownership de auth/RBAC.
- Sesión JWT y almacenamiento asociado.
- Permisos y feature flag `VITE_FEATURE_SETTINGS`.
- Compatibilidad con endpoints protegidos.
- Fallback `#not-authorized`.

## Known debt

- Coexisten utilidades DOM/globales con las páginas React.
- La cobertura efectiva no incluye todos los archivos de test existentes.
- La reconciliación API/Postman se gestiona fuera de OPT-A.
