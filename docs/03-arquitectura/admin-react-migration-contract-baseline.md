# ADMIN React Migration — Fase 0 Baseline contractual

> Actualizacion PR 8A cleanup: el Header global productivo del ADMIN ya es React
> (`apps/admin/src/react/header/*`) y el Header legacy
> (`apps/admin/src/components/header/*`, `apps/admin/src/styles/core/header.css`)
> fue removido. `#not-authorized` sigue legacy con
> `apps/admin/src/components/no-access.html` y `apps/admin/src/styles/no-access.css`.
>
> Actualizacion PR 8B cleanup: Login y Dashboard productivos ya son React
> (`apps/admin/src/react/pages/LoginPage.jsx` y
> `apps/admin/src/react/pages/DashboardPage.jsx`). Los fragments, modulos JS y CSS
> legacy de Login/Dashboard fueron removidos. `#not-authorized` sigue legacy.

## 1. Objetivo

Esta Fase 0 congela los contratos actuales del ADMIN antes de iniciar cualquier runtime React, bridge, adapter o migración visual/funcional. No agrega React, no instala dependencias, no cambia UI productiva, no modifica backend productivo y no modifica client.

La estrategia aprobada para el ADMIN es una migración parcial por fases; queda descartado cualquier enfoque big bang.

El documento habilita las fases futuras porque deja asentados los contratos que debe respetar cualquier convivencia legacy/React: rutas hash, render de fragments HTML, lifecycle de módulos, IDs/selectores, auth, RBAC, storage, eventos, feature flags, API Admin ↔ Backend y contratos compartidos con Client.

## 2. Estado inicial confirmado

| Chequeo            | Resultado                                         | Evidencia                                                                                                        |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Fecha del análisis | 2026-06-11                                        | `current_date` del entorno                                                                                       |
| Rama               | `codex/admin-react-phase0-contract-baseline`      | `git branch --show-current`                                                                                      |
| Estado Git inicial | Limpio antes de crear este documento              | `git status --short` sin salida                                                                                  |
| Top-level          | `C:/Users/Agulles/.codex/worktrees/5d4f/project`  | `git rev-parse --show-toplevel`                                                                                  |
| Base               | Basada en `origin/main`, sin commits ahead/behind | `git merge-base --is-ancestor origin/main HEAD`; `git rev-list --left-right --count origin/main...HEAD` => `0 0` |
| Últimos commits    | `b0120`, `c8fe0`, `2a5fc`, `4b331`, `2b334`       | `git log --oneline -5`                                                                                           |

Últimos commits registrados:

```text
b0120 Merge pull request #216 from EMA1322/codex/phase5-cart-readiness
c8fe0 feat(client-cart): redesign cart review experience
2a5fc Merge pull request #215 from EMA1322/codex/phase3-footer-readiness
4b331 feat(client-footer): migrate and redesign global footer
2b334 Merge pull request #214 from EMA1322/codex/phase2-header-react-migration
```

## 3. Arquitectura actual del ADMIN

El ADMIN es una SPA Vite vanilla modular. `apps/admin/package.json` declara `vite` y dependencias DOM/utilitarias, sin `react`, `react-dom` ni `@vitejs/plugin-react`. El entrypoint es `apps/admin/src/main.js`, que carga estilos globales y llama a `initRouter()` al `DOMContentLoaded` (`apps/admin/src/main.js:23`, `apps/admin/src/main.js:34`).

La app usa router hash propio en `apps/admin/src/utils/router.js`: define el mapa `routes`, resuelve `window.location.hash`, carga CSS por pantalla con `ensureStylesheetLoaded`, inyecta fragments HTML con `renderView`, carga módulos JS dinámicamente y ejecuta `initModule` cuando existe (`apps/admin/src/utils/router.js:28`, `apps/admin/src/utils/router.js:132`, `apps/admin/src/utils/router.js:205`, `apps/admin/src/utils/router.js:227`). No usa React Router.

Las vistas son fragments HTML bajo `apps/admin/src/components/**.html` y se inyectan con `container.innerHTML = html` en `renderView` (`apps/admin/src/utils/renderView.js:49`, `apps/admin/src/utils/renderView.js:64`). El app shell conserva `#admin-header` y crea/usa `#main-content` dentro de `#app` (`apps/admin/index.html:18`, `apps/admin/src/utils/renderView.js:74`).

El backend convive vía `API_BASE` y `apiFetch`, que agrega `Authorization: Bearer <token>` cuando hay token y normaliza errores/envelope (`apps/admin/src/utils/auth.js:189`, `apps/admin/src/utils/auth.js:230`, `apps/admin/src/utils/auth.js:270`, `apps/admin/src/utils/auth.js:348`).

## 4. Mapa de rutas hash

| Ruta hash            | Módulo                       | HTML/View                                    | JS módulo                             | CSS                          | Guard/RBAC                                             | Redirección/Fallback                 | Riesgo React                                          |
| -------------------- | ---------------------------- | -------------------------------------------- | ------------------------------------- | ---------------------------- | ------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------- |
| `#login`             | Login React                  | `LoginPage.jsx`                              | React route                           | CSS Module                   | Si ya hay auth, redirige a home permitido              | `pickHomeRoute()`                    | Medio: debe mantener redirect post-login y formulario |
| `#dashboard`         | Dashboard React              | `DashboardPage.jsx`                          | React route                           | CSS Module                   | `canRead('dashboard')`                                 | Si no hay permiso, `#not-authorized` | Alto: dashboard + quick actions + Settings flag       |
| `#products`          | Products + offers integradas | `/src/components/products/products.html`     | `components/products/products.js`     | `/src/styles/products.css`   | `canRead('products')`; acciones `data-rbac-action`     | Sin read => `#not-authorized`        | Crítico: DOM + filtros hash + CRUD + offers           |
| `#categories`        | Categories                   | `/src/components/categories/categories.html` | `components/categories/categories.js` | `/src/styles/categories.css` | `canRead('categories')`                                | Sin read => `#not-authorized`        | Alto: CRUD + modales + estado                         |
| `#users`             | Users / Roles                | `/src/components/users/users.html`           | `components/users/users.js`           | `/src/styles/users.css`      | `canRead('users')`; roles con `data-rbac-role="admin"` | Sin read => `#not-authorized`        | Crítico: RBAC sensible y tabs users/roles             |
| `#settings`          | Settings                     | `/src/components/settings/settings.html`     | `components/settings/settings.js`     | `/src/styles/settings.css`   | `FEATURE_SETTINGS` + `canRead('settings')`             | Flag off => `#dashboard`             | Crítico: settings públicos/privados y branding        |
| `#not-authorized`    | No access                    | `/src/components/no-access.html`             | sin módulo dedicado                   | `/src/styles/no-access.css`  | Ruta pública especial con CTA                          | CTA a home permitido o login         | Medio: fallback de permisos                           |
| fallback desconocida | Not found                    | `uiNotFound()`                               | router                                | CSS actual                   | Auth si no es login/no-access                          | Mensaje en `#app`                    | Medio: mantener UX de rutas inválidas                 |

Evidencia: mapa `routes` y guardias en `apps/admin/src/utils/router.js:28`, `apps/admin/src/utils/router.js:141`, `apps/admin/src/utils/router.js:153`, `apps/admin/src/utils/router.js:173`, `apps/admin/src/utils/router.js:183`, `apps/admin/src/utils/router.js:192`.

## 5. Mapa de renderizado y lifecycle

| Archivo                                          | Responsabilidad                               | Contrato lifecycle                                                                                     | Riesgo  | Evidencia                                                                                           |
| ------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------- |
| `apps/admin/src/utils/router.js`                 | Router hash, guardias, header, CSS, módulo JS | Debe escuchar `hashchange`, cargar HTML/CSS antes de `initModule`, y destruir header al volver a login | Crítico | `initRouter()` en `:264`; `hashchange` en `:265`; dynamic imports en `:213-246`                     |
| `apps/admin/src/utils/renderView.js`             | Inyección de fragment HTML                    | Debe resolver `#main-content` o crearlo dentro de `#app`; usa `innerHTML`                              | Alto    | `renderView()` en `:49`; `container.innerHTML` en `:60`, `:64`, `:69`                               |
| `apps/admin/src/react/header/AdminHeader.jsx`    | App shell/header/sidebar/drawer React         | Se monta desde el router con `createRoot`; no carga fragment/CSS legacy de Header                      | Alto    | `loadAdminHeader()` en `apps/admin/src/utils/router.js`; helpers en `apps/admin/src/react/header/*` |
| `apps/admin/src/components/products/products.js` | Orquestación Products                         | Mantiene `hashchangeHandler`; exporta `initModule` y `destroyModule`                                   | Crítico | `initModule` en `:104`; listener en `:144`; `destroyModule` en `:164`; remove en `:174`             |
| `apps/admin/src/components/users/users.js`       | Orquestación Users/Roles                      | Sincroniza filtros/tabs con hash y remueve listener antes de agregar                                   | Crítico | `window.removeEventListener` en `:190`; `addEventListener` en `:193`                                |
| `apps/admin/src/components/settings/settings.js` | Settings form                                 | No exporta destructor; bind de listeners al inicializar                                                | Alto    | `initSettings()` en `:981`; listeners en `:991-1043`                                                |
| `apps/admin/src/utils/modal.js`                  | Modal DOM global                              | Cierra modal activo, remueve Escape y overlay click                                                    | Alto    | `closeActiveModal()` en `:10`; `openModal()` en `:104`; Escape en `:159`                            |

Contrato para el futuro adapter React: montar React solo dentro de la vista que corresponda, después de que el router legacy haya decidido ruta/guardias; desmontar antes de reemplazar `innerHTML`; no tomar control global de `location.hash`; no duplicar listeners del header ni del módulo legacy.

## 6. Contratos DOM críticos

| Módulo                    | IDs críticos                                                                          | Clases hook                               | data-_ / data-rbac-_                                                                     | Selectores JS                                                  | Riesgo  | Evidencia                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| App shell/header/nav      | `admin-header`, navegación por hash                                                   | Header React CSS Modules                  | permisos via `canRead` y `featureSettings`                                               | `#admin-header`, drawer React                                  | Alto    | `router.js:loadAdminHeader`; `src/react/header/*`                                         |
| Login                     | Formulario React y errores de auth                                                    | CSS Module                                | No aplica                                                                                | `login()` helper y redirect post-login                         | Medio   | `apps/admin/src/react/pages/LoginPage.jsx`                                                |
| Dashboard                 | Summary, estados y quick actions                                                      | CSS Module                                | RBAC via `canRead`/`canWrite`                                                            | `apiFetch('/dashboard/summary')`, `window.location.hash`       | Alto    | `apps/admin/src/react/pages/DashboardPage.jsx`                                            |
| Products                  | `products-module`, `product-create`, filtros, tabla, paginación, templates            | `products__*`, `adminList__*`             | `data-rbac-module`, `data-rbac-action`, `data-action`, `data-offer-fields`, `data-field` | `#products-table-body`, `#tpl-product-form`, `#confirm-delete` | Crítico | `products.html:5-8`, `:17-22`, `:31-102`, `:160-318`; `products.render.bindings.js:27-50` |
| Offers dentro de Products | `products-offer-filter`, `field-offer-enabled`, `field-offer-discount`                | `products__filter--offer`                 | `data-offer-fields`, `data-field="offer-status"`                                         | Offer toggle y fields                                          | Crítico | `products.html:62-72`, `:214-228`, `:297-309`; `products.modals.js:305-308`               |
| Categories                | `categories-view`, `categories-create`, tabla/filtros/templates                       | `categories__*`, `adminList__*`           | `data-rbac-action`, `data-rbac-hide`                                                     | render table + modal bindings                                  | Alto    | `categories.html:24-25`, `:264-289`; `categories.render.table.js:54-67`                   |
| Users                     | `users-title`, `btn-user-new`, `users-filters`, `users-table`, `panel-users`          | `users__*`, `adminList__*`                | `data-rbac-action`, `data-rbac-hide`                                                     | `#users-tbody`, pagination refs                                | Crítico | `users.render.table.js:12-31`, `:237-239`                                                 |
| Roles                     | `tab-roles`, `panel-roles`, roles tbody                                               | `users__*`                                | `data-rbac-role="admin"`, `data-rbac-persist-disabled`                                   | role table actions                                             | Crítico | `users.render.roles.js:47-84`                                                             |
| Settings                  | `settings-module`, `settings-hours-form`, fields de identity/map/brand/payments/hours | `settings__*`                             | `data-rbac-module`, `data-rbac-action`, `data-error-for`                                 | `getRefs()` masivo                                             | Crítico | `settings.html:4-7`, `:38`, `:84-88`, `:272-276`; `settings.js:105-150`                   |
| Modal global              | nodos creados por JS                                                                  | `modal`, `modal__overlay`, `modal__panel` | acciones configuradas                                                                    | overlay click, Escape, close button                            | Alto    | `modal.js:104-168`                                                                        |

## 7. Contratos Auth y sesión

| Contrato               | Ubicación        | Consumidores                          | Riesgo  | Smoke                                              |
| ---------------------- | ---------------- | ------------------------------------- | ------- | -------------------------------------------------- |
| Token `auth_token`     | `localStorage`   | `apiFetch`, guards, backend `authJWT` | Crítico | Login correcto persiste token; logout lo remueve   |
| Usuario `user`         | `localStorage`   | Header/users/settings y estado auth   | Alto    | Login guarda user; refresh mantiene sesión         |
| `auth.roleId`          | `sessionStorage` | RBAC frontend y Users                 | Alto    | Usuario con rol limitado ve UI reducida            |
| `effectivePermissions` | `sessionStorage` | `applyRBAC`, guards                   | Crítico | Permisos backend se reflejan sin seed override     |
| `/auth/login`          | `login()`        | Login view                            | Crítico | Credenciales válidas redirigen a ruta permitida    |
| `/auth/me`             | `fetchMe()`      | `ensureAuthReady`, router             | Crítico | Refresh con token válido conserva sesión           |
| `/auth/logout`         | `logout()`       | Header/logout                         | Alto    | Logout redirige a `#login` y limpia storage        |
| 401/403                | `apiFetch()`     | Todos los módulos API                 | Crítico | 401 limpia sesión; 403 muestra no autorizado/error |
| Header Authorization   | `apiFetch()`     | Backend protegido                     | Crítico | Requests protegidos envían `Bearer`                |

Evidencia: `TOKEN_KEY` en `apps/admin/src/utils/auth.js:204`; storage en `:123`, `:128`, `:133`, `:435-449`, `:537-552`; `Authorization` en `:270`; login en `:513-578`; logout en `:583`; backend auth routes en `apps/backend/src/routes/auth.routes.js:11-17`; `authJWT` en `apps/backend/src/middlewares/authJWT.js:5-26`.

## 8. Contratos RBAC frontend

| Módulo     | Acciones RBAC                   | DOM hooks                                 | Helper                         | Riesgo  | Evidencia                                                                     |
| ---------- | ------------------------------- | ----------------------------------------- | ------------------------------ | ------- | ----------------------------------------------------------------------------- |
| Router     | read por módulo                 | ruta hash                                 | `canRead`, `moduleKeyFromHash` | Crítico | `router.js:183`; `rbac.js:100`, `:309-331`                                    |
| Header/nav | read por item                   | navegacion React filtrada por permisos    | `canRead`                      | Alto    | `src/react/header/headerNavigation.helpers.js`; `AdminHeader.jsx`             |
| Products   | write/read/update/delete        | botones create/view/edit/delete/toggle    | `applyRBAC` + guards de módulo | Crítico | `products.html:17-22`; `products.render.table.js:79`, `:169-183`              |
| Categories | write/update/delete             | create, status, view confirm, row actions | `applyRBAC`                    | Alto    | `categories.html:24-25`, `:264-289`; `categories.render.table.js:54-67`       |
| Users      | write/update/delete             | `btn-user-new`, row buttons, status       | `guardAction`, `applyRBAC`     | Crítico | `users.render.bindings.js:214-252`; `users.render.table.js:55-56`, `:237-239` |
| Roles      | admin-only create/update/delete | `data-rbac-role="admin"`                  | `applyRBAC`                    | Crítico | `users.render.roles.js:63-84`                                                 |
| Settings   | write                           | `social-links-add`, `settings-save`       | `canWrite('settings')`         | Crítico | `settings.html:84-88`, `:272-276`; `settings.js:433-452`                      |

`applyRBAC` decide visibilidad/disabled según `data-rbac-hide`, `data-rbac-persist-disabled`, permisos `r/w/u/d`, rol admin, usuario actual y tabs Users/Roles (`apps/admin/src/utils/rbac.js:386-581`).

## 9. Contratos RBAC backend

En Fase 0 el backend se analiza solo como contrato para la migración del ADMIN. No se implementan cambios backend: no se modifican endpoints, guards, middlewares, Prisma, migraciones ni seeds.

| Endpoint/Área                     | Guard backend                                 | Permiso requerido   | Consumidor ADMIN              | Riesgo  |
| --------------------------------- | --------------------------------------------- | ------------------- | ----------------------------- | ------- |
| `/api/v1/dashboard/summary`       | `authJWT`, `rbacGuard('dashboard','r')`       | dashboard read      | Dashboard                     | Alto    |
| `/api/v1/products` GET/show       | `authJWT`, `rbacGuard('products','r')`        | products read       | Products listado/detalle      | Alto    |
| `/api/v1/products` POST           | `authJWT`, `rbacGuard('products','w')`        | products write      | Crear producto                | Crítico |
| `/api/v1/products/:id` PUT/status | `authJWT`, `rbacGuard('products','u')`        | products update     | Edit/status                   | Crítico |
| `/api/v1/products/:id` DELETE     | `authJWT`, `rbacGuard('products','d')`        | products delete     | Eliminar producto             | Crítico |
| `/api/v1/offers`                  | `authJWT`, `rbacGuard('offers', r/w/u/d)`     | offers              | Offers integradas en Products | Crítico |
| `/api/v1/categories`              | `authJWT`, `rbacGuard('categories', r/w/u/d)` | categories          | Categories                    | Alto    |
| `/api/v1/users`                   | `authJWT`, `requireAdminRole()`               | role-admin          | Users                         | Crítico |
| `/api/v1/roles`                   | `authJWT`, `requireAdminRole()`               | role-admin          | Roles/permisos                | Crítico |
| `/api/v1/modules`                 | `authJWT`, `requireAdminRole()`               | role-admin          | Roles/permisos                | Crítico |
| `/api/v1/settings`                | `authJWT`, `rbacGuard('settings','r/w')`      | settings read/write | Settings                      | Crítico |

Evidencia: rutas protegidas en `apps/backend/src/routes/dashboard.routes.js:8`, `products.routes.js:17-64`, `offers.routes.js:16-46`, `categories.routes.js:17-62`, `users.routes.js:15-26`, `roles.routes.js:15-28`, `modules.routes.js:8-11`, `settings.routes.js:9-10`. `rbacGuard` consulta permisos token/DB (`apps/backend/src/middlewares/rbacGuard.js:7-32`) y `requireAdminRole` bloquea todo salvo `role-admin` (`apps/backend/src/middlewares/requireAdminRole.js:4-10`).

## 10. Mapa API Admin ↔ Backend

| Módulo ADMIN        | Helper/API frontend                                      | Endpoint backend                                       | Método                    | Payload sensible                           | Envelope/error                              | Riesgo migración |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------ | ------------------------- | ------------------------------------------ | ------------------------------------------- | ---------------- |
| Auth                | `login()`                                                | `/api/v1/auth/login`                                   | POST                      | email/password                             | `ok({ user, token, permissions })`; 401/429 | Crítico          |
| Auth                | `fetchMe()`                                              | `/api/v1/auth/me`                                      | GET                       | Bearer token                               | user + permissions                          | Crítico          |
| Auth                | `logout()`                                               | `/api/v1/auth/logout`                                  | POST                      | Bearer token                               | ok                                          | Alto             |
| Dashboard           | `apiFetch('/dashboard/summary')`                         | `/api/v1/dashboard/summary`                            | GET                       | token                                      | ok(data)                                    | Alto             |
| Products            | `productsApi.list/get/create/update/changeStatus/remove` | `/api/v1/products...`                                  | GET/POST/PUT/PATCH/DELETE | price, stock, status, categoryId, imageUrl | envelope + field errors                     | Crítico          |
| Offers              | `offersApi.list/create/update/remove`                    | `/api/v1/offers...`                                    | GET/POST/PUT/DELETE       | productId, discountPercent                 | envelope + field errors                     | Crítico          |
| Categories          | `categoriesApi.list` y módulo Categories                 | `/api/v1/categories...`                                | GET/POST/PUT/PATCH/DELETE | name, status, imageUrl                     | envelope + field errors                     | Alto             |
| Users               | Users state/apis                                         | `/api/v1/users...`                                     | GET/POST/PUT/DELETE       | fullName, email, phone, roleId             | role-admin + errors                         | Crítico          |
| Roles               | Users roles APIs                                         | `/api/v1/roles...`                                     | GET/POST/PUT/DELETE       | roleId, name, permissions                  | role-admin + errors                         | Crítico          |
| Permissions/modules | Users roles APIs                                         | `/api/v1/modules`, `/api/v1/roles/:roleId/permissions` | GET/PUT                   | permission matrix                          | role-admin + errors                         | Crítico          |
| Settings            | `apiFetch('/settings')`                                  | `/api/v1/settings`                                     | GET/PUT                   | siteConfig público/privado                 | field errors                                | Crítico          |

Evidencia: `productsApi/categoriesApi/offersApi` en `apps/admin/src/utils/apis.js:19-146`; auth/apiFetch en `apps/admin/src/utils/auth.js:230-392`, `:402-583`; settings save/load en `apps/admin/src/components/settings/settings.js:913-963`; backend router raíz en `apps/backend/src/routes/index.js:34-43`.

## 11. Contratos compartidos Admin ↔ Client

| Contrato compartido    | Admin lo modifica                                        | Backend lo expone                                                   | Client lo consume                                  | Riesgo  |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | ------- |
| Products públicos      | Products CRUD/status                                     | `/api/v1/public/products`                                           | `fetchPublicProducts()` y Products/Home            | Crítico |
| Offers públicas        | Offers integradas en Products                            | `/api/v1/public/offers`                                             | Home offers y ProductCard                          | Crítico |
| Categories públicas    | Categories CRUD/status/imageUrl                          | `/api/v1/public/categories`                                         | Home/Products filtros                              | Alto    |
| Settings públicos      | Settings                                                 | `/api/v1/public/settings`, `/business-status`, `/commercial-config` | Header/Footer/Home                                 | Crítico |
| Branding/logo          | Settings brand logo/fav                                  | public settings/commercial config                                   | Footer/Header logo/contact                         | Alto    |
| Payload product/cart   | Product price/finalPrice/imageUrl/discountPercent/source | public products/offers                                              | `ProductCard`, `productCartPayload`, `cartService` | Crítico |
| Estado active/inactive | Admin status                                             | public services filtran/normalizan                                  | Client muestra catálogo activo                     | Alto    |

Evidencia Client: public API en `apps/client/src/api/public.js:51-76`; Product payload en `apps/client/src/react/pages/ProductsPage.jsx:37-56`; Home offers/settings en `apps/client/src/react/pages/HomePage.jsx:158-180`; cart payload en `apps/client/src/react/utils/productCartPayload.js:7-9`; `cart:updated` en `apps/client/src/utils/cartService.js:34-38`; Footer/Header settings en `apps/client/src/react/components/Footer.jsx:87-150` y `Header.jsx:143-153`.

## 12. Storage y eventos globales

| Clave/evento                        | Tipo                    | Productor                           | Consumidor                         | Riesgo             | Smoke                                           |
| ----------------------------------- | ----------------------- | ----------------------------------- | ---------------------------------- | ------------------ | ----------------------------------------------- |
| `auth_token`                        | `localStorage`          | `setToken/login/logout`             | `apiFetch`, router guards          | Crítico            | Login/logout                                    |
| `user`                              | `localStorage`          | `fetchMe/login/clearAuthState`      | Auth state, Users helpers          | Alto               | Refresh de sesión                               |
| `API_BASE`                          | `localStorage` override | Usuario/dev                         | `API_BASE` resolver                | Medio              | Cambiar API base local y pedir `/auth/me`       |
| `DATA_SOURCE`                       | `localStorage` override | Usuario/dev                         | `getDataSource()`                  | Medio              | Confirmar modo `api` default                    |
| `auth.roleId`                       | `sessionStorage`        | Auth/RBAC                           | Users/RBAC                         | Alto               | Rol limitado                                    |
| `rbac.roleId`                       | `sessionStorage`        | `setServerSession/setRoleId`        | `applyRBAC`                        | Alto               | UI por rol                                      |
| `rbac.permMap`                      | `sessionStorage`        | `setServerSession/ensureRbacLoaded` | `can*`, `applyRBAC`                | Crítico            | Permisos por módulo                             |
| `effectivePermissions`              | `sessionStorage`        | Auth/RBAC                           | `applyRBAC`, Users                 | Crítico            | Cambios de permisos                             |
| `rbac.permissions.override`         | `localStorage`          | Overrides locales                   | seed RBAC fallback                 | Alto               | No contaminar permisos backend                  |
| `admin.settings.brand.logo`         | `localStorage`          | Settings                            | `getSettingsBrandLogoUrl()`        | Medio              | Guardar logo y recargar                         |
| `admin:settings-brand-logo-updated` | `CustomEvent`           | Settings                            | Posibles shell/header consumidores | Medio              | Guardar brand logo                              |
| `users:tab-enforce`                 | `CustomEvent`           | `applyRBAC`                         | Users tabs                         | Alto               | Usuario sin admin queda en users                |
| `cart` / `cart:updated`             | Client shared           | Client cart                         | Header/Cart/Confirm                | Crítico compartido | Admin product price/image no rompe cart público |

Evidencia: storage auth en `apps/admin/src/utils/auth.js:123-133`, `:190`, `:204-213`, `:435-449`; RBAC storage/event en `apps/admin/src/utils/rbac.js:19-20`, `:65-73`, `:197-233`, `:492`; Settings logo event en `apps/admin/src/components/settings/settings.js:36-68`; Client cart event en `apps/client/src/utils/cartService.js:34-38`.

## 13. Feature flags

| Flag                               | Ubicación                                            | Default | Impacto UI                                           | Impacto ruta                        | Riesgo |
| ---------------------------------- | ---------------------------------------------------- | ------- | ---------------------------------------------------- | ----------------------------------- | ------ |
| `VITE_FEATURE_SETTINGS`            | `apps/admin/.env.example`, router, header, dashboard | `false` | Oculta Settings del header/dashboard cuando está off | `#settings` redirige a `#dashboard` | Alto   |
| `DATA_SOURCE` / `VITE_DATA_SOURCE` | `apps/admin/src/utils/api.js`                        | `api`   | Define origen de datos legacy/api                    | No cambia ruta                      | Medio  |

Evidencia: default `VITE_FEATURE_SETTINGS=false` en `apps/admin/.env.example:9`; router en `apps/admin/src/utils/router.js`; Header React en `apps/admin/src/react/header/headerNavigation.helpers.js`; dashboard en `apps/admin/src/react/pages/DashboardPage.jsx`; `DATA_SOURCE` en `apps/admin/src/utils/api.js:24-35`.

## 14. Modales, drawers y overlays

| Componente global         | IDs/selectores                                                                   | Usado por                   | Contrato                                                               | Riesgo React |
| ------------------------- | -------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------- | ------------ |
| Modal global `openModal`  | nodos `.modal__overlay`, `.modal__panel`; close button creado                    | Products, Categories, Users | Cerrar por botón, Escape y click fuera; foco inicial al primer control | Alto         |
| Product form modal        | `tpl-product-form`, `products-form`, `products-form-submit`, `field-*`           | Products CRUD + offers      | Template clonable, validación field-level, offer toggle                | Crítico      |
| Product delete/view modal | `tpl-product-delete`, `confirm-delete`, `tpl-product-view`, `product-view-close` | Products                    | Confirmar delete y vista solo lectura                                  | Alto         |
| Category modals           | templates/fields de Categories                                                   | Categories CRUD             | Form/status/delete/view                                                | Alto         |
| Users modals              | Users/Roles modals                                                               | Users/Roles                 | Crear/editar usuarios, roles/permisos                                  | Crítico      |
| Header drawer/sidebar     | refs React del drawer                                                            | App shell React             | Cierre, scroll lock, focus return, navegacion hash                     | Alto         |

Evidencia: modal global en `apps/admin/src/utils/modal.js:10-168`; Products templates en `apps/admin/src/components/products/products.html:160-318`; Products modal JS en `apps/admin/src/components/products/products.modals.js:110-113`, `:297-308`, `:356-437`, `:523-531`, `:569-587`; Header drawer React en `apps/admin/src/react/header/useHeaderDrawer.js`.

## 15. Estados loading/error/empty/success

| Módulo     | Loading                   | Error                                        | Empty             | Success/feedback                              | Riesgo  |
| ---------- | ------------------------- | -------------------------------------------- | ----------------- | --------------------------------------------- | ------- |
| Login      | Submit disabled/feedback  | `#login-error`                               | No aplica         | Redirect                                      | Medio   |
| Dashboard  | Cards/loading interno     | Error dashboard                              | Empty métricas    | Quick actions                                 | Alto    |
| Products   | `#products-loading`       | `#products-error`, `#products-error-message` | `#products-empty` | `data-status="success"` y tabla               | Alto    |
| Categories | Loading/error/empty/table | Error state                                  | Empty state       | Tabla + snackbar/modal                        | Alto    |
| Users      | `#users-loading`          | `#users-error`, `#users-error-message`       | `#users-empty`    | Tabla/footer/meta                             | Alto    |
| Roles      | Empty roles table         | Error vía Users state                        | Empty roles       | Tabla roles                                   | Crítico |
| Settings   | `#settings-loading`       | `#settings-error`, `#settings-error-message` | `#settings-empty` | `#settings-success`, `#settings-form-success` | Crítico |
| No access  | No aplica                 | No autorizado                                | No aplica         | CTA                                           | Medio   |

Evidencia: Products states en `apps/admin/src/components/products/products.html:107-131` y render en `products.render.table.js:283-362`; Users states en `users.render.table.js:12-31`, `:154-177`, `:255-264`; Settings states en `settings.html:19-40` y `settings.js:164-204`.

## 16. Matriz de acoplamiento por archivo

| Archivo                                                       | Módulo          | Responsabilidad                       | DOM/IDs | RBAC     | Storage/eventos                   | API           | Acoplamiento | Riesgo  | Recomendación                                   |
| ------------------------------------------------------------- | --------------- | ------------------------------------- | ------- | -------- | --------------------------------- | ------------- | ------------ | ------- | ----------------------------------------------- |
| `apps/admin/src/main.js`                                      | App             | Entry point                           | Bajo    | No       | No                                | No            | Medio        | Medio   | Mantener init único del router                  |
| `apps/admin/src/utils/router.js`                              | Router          | Hash routes, guards, CSS, module init | Alto    | Sí       | Auth indirecto                    | No directo    | Crítico      | Crítico | Fase 0.5A debe integrarse aquí sin React Router |
| `apps/admin/src/utils/renderView.js`                          | Render          | Inyecta fragments HTML                | Alto    | No       | No                                | fetch HTML    | Alto         | Alto    | Adapter React debe desmontar antes de reemplazo |
| `apps/admin/src/utils/auth.js`                                | Auth/API        | Token, API_BASE, login/logout/me      | No      | Permisos | local/sessionStorage              | Sí            | Crítico      | Crítico | No duplicar cliente API en React                |
| `apps/admin/src/utils/rbac.js`                                | RBAC            | Permisos, DOM gating                  | Alto    | Sí       | session/localStorage, CustomEvent | Seed fallback | Crítico      | Crítico | Mantener como fuente hasta extraer contrato     |
| `apps/admin/src/utils/apis.js`                                | API             | Products/categories/offers helpers    | No      | No       | No                                | Sí            | Medio        | Alto    | Reutilizar helpers en React bridge              |
| `apps/admin/src/utils/modal.js`                               | Modal           | Overlay/panel global                  | Alto    | No       | Escape listener                   | No            | Alto         | Alto    | Definir ownership si React usa portals          |
| `apps/admin/src/react/header/AdminHeader.jsx`                 | Shell React     | Sidebar/topbar/nav/logout             | Alto    | Sí       | listeners React/drawer            | Auth/logout   | Crítico      | Alto    | Productivo; legacy removido en PR 8A cleanup    |
| `apps/admin/src/react/pages/LoginPage.jsx`                    | Login React     | Form auth                             | Medio   | No       | Auth via helper                   | Sí            | Alto         | Alto    | Productivo; legacy removido en PR 8B cleanup    |
| `apps/admin/src/react/pages/DashboardPage.jsx`                | Dashboard React | Summary/quick actions                 | Alto    | Sí       | hash                              | Sí            | Alto         | Alto    | Productivo; legacy removido en PR 8B cleanup    |
| `apps/admin/src/components/products/products.js`              | Products        | State init/hash lifecycle             | Alto    | Sí       | hash listeners                    | Sí            | Crítico      | Crítico | Separar listado antes de CRUD                   |
| `apps/admin/src/components/products/products.render.table.js` | Products        | Tabla/paginación/estados              | Alto    | Sí       | No                                | No            | Alto         | Alto    | Mantener IDs y `data-action`                    |
| `apps/admin/src/components/products/products.modals.js`       | Products/Offers | CRUD modal y offers                   | Alto    | Sí       | No                                | Sí            | Crítico      | Crítico | No romper offer integrada                       |
| `apps/admin/src/components/categories/categories.js`          | Categories      | State/init                            | Alto    | Sí       | hash/listeners                    | Sí            | Alto         | Alto    | Migrar después de Products                      |
| `apps/admin/src/components/categories/categories.modals.js`   | Categories      | CRUD modals                           | Alto    | Sí       | No                                | Sí            | Alto         | Alto    | Portar con contrato modal claro                 |
| `apps/admin/src/components/users/users.js`                    | Users/Roles     | State/init/hash tabs                  | Alto    | Sí       | hash/listeners                    | Sí            | Crítico      | Crítico | Dejar para Fase 5 por sensibilidad RBAC         |
| `apps/admin/src/components/users/users.render.roles.js`       | Roles           | Roles table/actions                   | Alto    | Sí       | No                                | No            | Crítico      | Crítico | Preservar admin-only                            |
| `apps/admin/src/components/settings/settings.js`              | Settings        | Form siteConfig                       | Alto    | Sí       | localStorage + CustomEvent        | Sí            | Crítico      | Crítico | Fase final por impacto público                  |
| `apps/admin/src/utils/featureFlags.js`                        | Flags           | Normaliza flags                       | No      | No       | No                                | No            | Bajo         | Medio   | Reusar sin cambios                              |

## 17. Smokes mínimos del ADMIN actual

| Fase futura | Smoke                    | Pasos                                            | Resultado esperado                             | Contrato cubierto            |
| ----------- | ------------------------ | ------------------------------------------------ | ---------------------------------------------- | ---------------------------- |
| 0.5A        | Redirect sin sesión      | Abrir `#dashboard` sin token                     | Redirige a `#login`                            | Router/auth guard            |
| 1           | Login correcto           | Login con admin válido                           | Token/user persistidos y ruta permitida        | Auth/session                 |
| 1           | Login incorrecto         | Login con password inválido                      | Error visible, sin token                       | Auth error                   |
| 1           | Logout                   | Click logout                                     | Storage auth/RBAC limpio y `#login`            | Logout/session               |
| 2           | Dashboard carga          | Login y abrir `#dashboard`                       | Summary/acciones visibles según permisos       | Dashboard + RBAC             |
| 2           | Quick actions RBAC       | Usuario sin permiso                              | Acciones ocultas o redirigen a no autorizado   | RBAC frontend                |
| 3A          | Products listado         | Abrir `#products`                                | Loading → tabla/empty/error coherente          | Products read                |
| 3A          | Products filtros         | Buscar/cambiar filtros/page                      | Hash/filtros sincronizados                     | Hash + render                |
| 3B          | Products CRUD            | Crear/editar/eliminar/status                     | API correcta y tabla actualiza                 | Products write/update/delete |
| 3C          | Products offers          | Crear/editar oferta desde producto               | Offer visible en admin y client público        | Offers integrada             |
| 4           | Categories CRUD          | Crear/editar/status/eliminar/restaurar           | Estados y public categories coherentes         | Categories                   |
| 5           | Users tabs               | Abrir `#users`, cambiar tabs                     | Users/Roles respetan rol admin                 | Users/Roles RBAC             |
| 5           | Roles/permisos           | Editar permisos de rol                           | Persisten y afectan UI/API                     | RBAC end-to-end              |
| 6           | Settings flag off        | `VITE_FEATURE_SETTINGS=false`, abrir `#settings` | Redirige a `#dashboard`                        | Feature flag                 |
| 6           | Settings flag on         | Habilitar flag y abrir Settings                  | Carga form si permisos read                    | Settings route               |
| 6           | Settings guardado        | Editar logo/contacto                             | PUT ok, feedback y datos públicos actualizados | Settings/public              |
| 6           | Branding logo event      | Guardar logo                                     | `admin:settings-brand-logo-updated` emitido    | Evento global                |
| Todas       | 401/403                  | Token vencido o permiso insuficiente             | 401 limpia sesión; 403 bloquea acción          | API errors                   |
| Todas       | Mobile navegación básica | Viewport móvil, abrir/cerrar drawer y navegar    | Sin overflow, foco razonable                   | Header shell                 |

## 18. Riesgos por módulo

| Módulo            | Riesgo principal                                    | Nivel   | Motivo                                    | Mitigación                                |
| ----------------- | --------------------------------------------------- | ------- | ----------------------------------------- | ----------------------------------------- |
| Router/renderView | Reemplazar `innerHTML` rompe mounts/listeners React | Crítico | Es frontera de convivencia                | Bridge con mount/unmount explícito        |
| Auth/API          | Duplicar `apiFetch` o token storage                 | Crítico | 401/403 y Bearer son transversales        | Reusar `auth.js`                          |
| RBAC frontend     | UI permite acciones sin permiso o esconde de más    | Crítico | DOM gating + backend guards sensibles     | Smokes por rol y snapshots de permisos    |
| Backend RBAC      | Diferencia `rbacGuard` vs `requireAdminRole`        | Crítico | Users/Roles no usan permisos granulares   | Documentar excepción y testear role-admin |
| Products/offers   | Offers viven dentro de Products pero API separada   | Crítico | Riesgo de partir flujo de producto/oferta | Migrar listado, CRUD y offers en subfases |
| Settings          | Cambia datos públicos del Client                    | Crítico | Afecta header/footer/home/business status | Dejar al final y probar client público    |
| Header shell      | Drawer/nav/logout global                            | Alto    | Listeners + scroll lock + RBAC nav        | Migrar con shell operativo en Fase 2      |
| Categories        | CRUD visible públicamente                           | Alto    | Activo/inactivo e imagen pública          | Smokes Admin + Client                     |
| Dashboard         | Quick actions y flag Settings                       | Alto    | Navegación + permisos                     | Migrar después de Login                   |
| Login             | Primer punto React                                  | Alto    | Redirección post-login                    | Fase 1 aislada                            |

## 19. Orden final de migración

1. Pre-Fase Visual — Dirección visual Refine. Ya realizada como referencia visual externa, sin adopción de Refine/Ant Design.
2. Fase 0 — Baseline contractual. Este documento congela rutas, DOM, auth, RBAC, APIs, storage/eventos y riesgos.
3. Fase 0.5A — React runtime bridge. Obligatoria porque ADMIN no declara React ni plugin React en `apps/admin/package.json`; debe integrarse al router hash legacy.
4. Fase 0.5B — Admin UI foundation. Debe crear primitives/tokens sin alterar pantallas funcionales.
5. Fase 1 — Login React. Es el flujo aislable con menor superficie funcional, pero conserva auth/token/redirect.
6. Fase 2 — Dashboard React + shell operativo inicial. Sigue por dependencia con navegación, header y quick actions.
7. Fase 3A — Products listado. Primero lectura/filtros/tabla por alto acoplamiento DOM.
8. Fase 3B — Products CRUD. Después del listado, por modales, validaciones y acciones sensibles.
9. Fase 3C — Offers integradas en Products. Se mantiene dentro de Products porque el admin actual las opera en Product form/view y usa API `/offers`.
10. Fase 4 — Categories. Similar a Products pero menor acoplamiento que offers/product payload.
11. Fase 5 — Users / Roles. Se posterga por sensibilidad RBAC y excepción backend `requireAdminRole`.
12. Fase 6 — Settings. Última por feature flag, siteConfig público, branding/logo y efectos en Client.

## 20. Relación con dirección visual Refine

La dirección visual aprobada se usará solo en fases futuras: dark premium operativo, sidebar izquierda desktop, topbar compacta, cards, tablas, drawers, badges, acento naranja La Fileto `#FAA718`, mobile real y a11y. Refine se usa únicamente como referencia visual: no se adopta Refine como framework, dependencia, arquitectura ni base de componentes. Este baseline no implementa estilos, tokens, componentes ni assets.

Restricciones confirmadas para fases futuras: no copiar Refine, no adoptar Ant Design, no adoptar React Router, no copiar logos/assets/datos de terceros y no implementar el Google Maps roto de la demo. La prioridad contractual sigue siendo no romper auth, RBAC, hash routes, storage, eventos, API contracts ni side effects.

## 21. Gates de salida para Fase 0

- [x] Documento contractual creado.
- [x] Rutas hash inventariadas.
- [x] Auth/session inventariado.
- [x] RBAC frontend inventariado.
- [x] RBAC backend inventariado.
- [x] API Admin ↔ Backend mapeada.
- [x] Storage/eventos inventariados.
- [x] Feature flags inventariados.
- [x] Modales globales inventariados.
- [x] Matriz de acoplamiento por archivo completada.
- [x] Smokes mínimos definidos.
- [x] Riesgos por módulo clasificados.
- [x] Orden de migración asentado.
- [x] Offers dentro de Products documentado.
- [x] Settings al final documentado.
- [x] No se modificó código productivo.

## 22. Recomendaciones para Fase 0.5A

- Agregar explícitamente `react`, `react-dom` y `@vitejs/plugin-react` solo en la fase 0.5A, no en Fase 0.
- Mantener Vite como runtime y sumar plugin React sin cambiar el router hash legacy.
- Crear un adapter de montaje con contrato claro: `mountReactView(route, container)` y `unmountReactView(route)` o equivalente.
- Montar React dentro de `#main-content` o contenedor de vista, nunca reemplazar `#admin-header`/`#app` completo sin fase específica.
- Antes de cada navegación, desmontar React y limpiar efectos/listeners para no convivir mal con `container.innerHTML`.
- Reusar `apiFetch`, `login`, `logout`, `fetchMe`, `can*` y `applyRBAC` mientras no exista una nueva capa contractual aprobada.
- No introducir React Router; el hash router legacy sigue siendo la frontera de convivencia.
- No migrar pantallas en 0.5A. El smoke mínimo del bridge debe probar montaje/desmontaje no visual, navegación legacy intacta, auth guard intacto y ausencia de doble listener.

## 23. Evidencias

Comandos usados:

```text
git status --short
git branch --show-current
git rev-parse --show-toplevel
git log --oneline -5
git fetch origin main --prune
git merge-base --is-ancestor origin/main HEAD
git rev-list --left-right --count origin/main...HEAD
Get-ChildItem -Path docs -Recurse -File
Get-ChildItem -Path apps\admin -Recurse -File
rg -n --glob '!**/node_modules/**' "renderView|initModule|destroy|hashchange|location\.hash|routes|router|viewHtmlPath|cssHref|fetch\(|innerHTML|insertAdjacentHTML|template|getElementById|querySelector|querySelectorAll|addEventListener|removeEventListener|CustomEvent|dispatchEvent|localStorage|sessionStorage|data-rbac|dataset|auth_token|Authorization|Bearer|login|logout|401|403|canRead|canWrite|canUpdate|canDelete|feature|flag|VITE_FEATURE" apps/admin
rg -n --glob '!**/node_modules/**' "router|app\.use|/api/v1|auth|login|me|logout|rbac|rbacGuard|requireAdminRole|permission|permissions|role|roles|dashboard|products|offers|categories|users|settings|siteConfig|error|ok|data|code|message|cors|requestId|timeout" apps/backend/src apps/backend/prisma/schema.prisma apps/backend/tests
rg -n "settings|siteConfig|products|offers|categories|public|logo|branding|cart|imageUrl|price|discount" apps/client/src apps/client/public apps/client/index.html
rg -n "id=|class=|data-rbac|data-action|template|data-field|data-close-modal|aria-|hidden" apps/admin/src/components/products/products.html apps/admin/src/components/categories/categories.html apps/admin/src/components/users/users.html apps/admin/src/components/settings/settings.html apps/admin/src/components/no-access.html apps/admin/src/react/header apps/admin/src/react/pages/LoginPage.jsx apps/admin/src/react/pages/DashboardPage.jsx
```

Referencias principales:

- ADMIN router/render: `apps/admin/src/utils/router.js:28`, `:132`, `:173`, `:205`, `:227`, `:264`; `apps/admin/src/utils/renderView.js:49`, `:60`, `:64`.
- Auth/API: `apps/admin/src/utils/auth.js:189`, `:204`, `:230`, `:270`, `:402`, `:513`, `:583`.
- RBAC frontend: `apps/admin/src/utils/rbac.js:19`, `:60`, `:193`, `:309`, `:386`, `:525`, `:581`.
- Products/offers: `apps/admin/src/components/products/products.html:5`, `:17`, `:62`, `:160`; `apps/admin/src/components/products/products.modals.js:297`, `:356`, `:523`; `apps/admin/src/utils/apis.js:19`.
- Settings: `apps/admin/src/components/settings/settings.html:4`, `:84`, `:272`; `apps/admin/src/components/settings/settings.js:36`, `:52`, `:913`, `:957`.
- Backend routing/RBAC: `apps/backend/src/app.js:45`; `apps/backend/src/routes/index.js:34-43`; `apps/backend/src/routes/products.routes.js:17-64`; `apps/backend/src/routes/settings.routes.js:9-10`; `apps/backend/src/middlewares/rbacGuard.js:7`; `apps/backend/src/middlewares/requireAdminRole.js:4`.
- Client shared contracts: `apps/client/src/api/public.js:51-76`; `apps/client/src/react/pages/ProductsPage.jsx:37-56`; `apps/client/src/react/pages/HomePage.jsx:158-180`; `apps/client/src/utils/cartService.js:34-38`.
