---
status: Evaluación técnica
owner: Frontend Lead + Tech Lead
last_update: 2026-04-13
scope: Diagnóstico de arquitectura del admin SPA vanilla y decisión sobre adopción de React.
---

# Evaluación de migración a React para `apps/admin`

## 1. Propósito
Este documento evalúa, con evidencia del repositorio, la conveniencia de migrar el admin actual (`apps/admin`) a React en esta fase.

La evaluación responde:
- costo de mantenimiento actual;
- nivel de acoplamiento a DOM/HTML/RBAC;
- valor real potencial de React;
- riesgo funcional por módulo;
- recomendación: mantener, migrar parcial o migrar total;
- criterios objetivos para reabrir/postergar.

> Alcance: diagnóstico arquitectónico read-only. No se implementa migración en este PR.

## 2. Estado actual del admin
Estado vigente observado:
- `apps/admin` es una SPA vanilla modular con Vite.
- Navegación por hash (`#login`, `#dashboard`, `#products`, `#categories`, `#users`, `#settings`).
- Render de vistas por fetch de fragmentos HTML y carga dinámica de JS/CSS por ruta.
- Guards de auth + RBAC centralizados en router/utilidades.
- Módulos de negocio ya separados por dominio, con archivos de estado/render/bindings (especialmente products, categories, users).

Conclusión de estado: hay modularidad y convenciones, pero la base sigue siendo fuertemente orientada a templates HTML + selectores/IDs + atributos `data-rbac-*`.

## 3. Arquitectura actual del admin

### 3.1 Entry point y bootstrap
- `main.js` inicializa modales globales y router en `DOMContentLoaded`.
- Los estilos globales se cargan en entry; los de módulos se cargan por ruta.

Implicación: la app ya opera con división por capas (shell + routing + módulos), sin framework de componentes.

### 3.2 Router y dynamic imports
- `router.js` define rutas centralizadas con `viewHtmlPath` + `cssHref`.
- Cada navegación:
  1) valida auth,
  2) asegura RBAC,
  3) carga stylesheet,
  4) renderiza HTML por `renderView(path)`,
  5) hace `import()` dinámico del módulo JS.
- Header también se carga por fetch de HTML e `import()` dinámico.

Implicación: hay code-splitting funcional y lazy loading por módulo, patrón equivalente a objetivos de performance que normalmente se buscan en una migración React.

### 3.3 Auth y sesión
- `auth.js` concentra token (`localStorage`), `apiFetch`, `fetchMe`, `login`, `logout`.
- Sincroniza estado con `sessionStorage` (`auth.roleId`, `effectivePermissions`) y colabora con RBAC.

Implicación: capa de auth razonablemente consolidada y reusable, pero muy ligada a side effects de navegador (storage + hash redirect).

### 3.4 RBAC
- `rbac.js` soporta:
  - sesión efectiva desde backend (`setServerSession`);
  - fallback seed `/data/rbac_permissions.json`;
  - overrides en `localStorage`;
  - aplicación de permisos sobre elementos con `data-rbac-*`.
- El filtrado de UI depende de atributos en HTML y de escaneo/manipulación de nodos.

Implicación: RBAC está maduro funcionalmente, pero su implementación es estructuralmente DOM-driven.

### 3.5 Capa API y estado por módulo
- Existe wrapper REST compartido (`utils/apis.js`) para products/categories/offers.
- Cada módulo relevante tiene estado y render por responsabilidades (`*.state.js`, `*.render.*.js`, `*.modals.js`, `*.js`).

Implicación: hay una base importante reutilizable para una eventual migración por fases (especialmente capa API y validaciones/helpers).

## 4. Acoplamientos críticos y riesgos

## 4.1 Acoplamiento a templates HTML
Los módulos usan archivos HTML grandes con:
- estructura completa de vista;
- `<template>` para modales;
- IDs de controles/tabla/paginación/errores.

Riesgo de migración: alta superficie de regresión visual y funcional por cada reemplazo de template.

### 4.2 Acoplamiento a IDs/selectores/eventos
Patrón repetido:
- `querySelector`/`getElementById` masivo;
- listeners explícitos por control;
- coordinación manual de estado visual (`hidden`, clases, `dataset`, `aria-*`).

Riesgo de migración: alto. Si no se migra verticalmente (vista completa), coexistir vanilla + React en el mismo módulo puede duplicar fuentes de verdad.

### 4.3 Acoplamiento a `data-rbac-*`
- Menú, botones y acciones usan `data-rbac-module`, `data-rbac-action`, `data-rbac-role`, `data-rbac-hide`.
- RBAC se aplica recorriendo el DOM renderizado.

Riesgo de migración: alto en módulos con muchas acciones (users/products/categories/settings).

### 4.4 Acoplamiento router ↔ vistas
- El router conoce explícitamente cada ruta y su módulo JS.
- Las rutas asumen carga de fragmentos HTML concretos.

Riesgo de migración: medio. Es controlable, pero obliga a estrategia de convivencia clara (ruta por ruta).

### 4.5 Acoplamiento auth/session + hash
- Navegación y guards dependen del hash router actual.
- Login/logout y redirecciones están acoplados a `window.location.hash`.

Riesgo de migración: medio-alto si se cambia a router React distinto sin capa de compatibilidad.

## 5. Evaluación de mantenibilidad actual

Fortalezas observadas:
- separación de módulos por dominio;
- capa auth/api común;
- code-splitting por rutas;
- patrones de estado/loading/error/empty ya unificados en varios módulos;
- base estable y operativa (sin deuda bloqueante inmediata detectada para operar el admin actual).

Costos actuales de mantenimiento:
- verbosidad alta en manejo manual de DOM;
- dificultad para refactors UI grandes por dependencia en IDs/templates;
- pruebas de integración potencialmente más frágiles ante cambios de markup;
- duplicación de patrones de bindings/render entre módulos.

Veredicto de mantenibilidad hoy: **mantenible con costo medio**, pero el costo escala más rápido si aumentan funcionalidades complejas en Users/Roles, Settings o reglas de UI condicional.

## 6. Valor potencial de migrar a React
Valor real esperado (si se hace bien):
- mejor composición de UI en componentes reutilizables;
- menor manipulación manual de DOM y menor riesgo de desincronización de estado/UI;
- ergonomía superior para features complejas y formularios grandes;
- convergencia tecnológica con `apps/client` (ya React), útil para onboarding y prácticas comunes.

Valor que **no** es automático:
- no reduce por sí solo complejidad de negocio RBAC/auth;
- no elimina riesgo funcional de módulos críticos;
- no justifica migración total inmediata si el objetivo de corto plazo es solo estabilidad operativa.

## 7. Comparación de escenarios

### A) Mantener admin vanilla por ahora
**Pros**
- riesgo funcional mínimo inmediato;
- cero costo de migración en esta fase;
- preserva estabilidad de auth/RBAC ya consolidada.

**Contras**
- aumenta costo de evolución UI mediano plazo;
- mantiene fricción de mantenimiento DOM-driven;
- posterga convergencia frontend con stack React.

**Cuándo elegirlo**
- roadmap centrado en backend/operación y no en expansión fuerte del admin.

### B) Migración parcial por módulos
**Pros**
- balance riesgo/valor;
- permite validar arquitectura React en admin sin “big bang”;
- aprendizaje incremental sobre RBAC/auth en contexto real.

**Contras**
- coexistencia temporal de dos paradigmas;
- necesidad de contratos claros entre router legacy y módulos React.

**Cuándo elegirlo**
- se necesita evolución continua del admin, pero con control de riesgo.

### C) Migración completa a React
**Pros**
- máxima convergencia tecnológica;
- arquitectura homogénea a largo plazo.

**Contras**
- riesgo alto de regresiones en auth/RBAC/flows críticos;
- mayor tiempo de ejecución;
- costo de QA alto y concentración de riesgo en una sola ventana.

**Cuándo elegirlo**
- solo con capacidad de ejecución dedicada + ventana de hardening extensa + tests E2E robustos previos.

## 8. Riesgos principales por módulo

### 8.1 Login
- Riesgo: **medio**.
- Motivos: flujo acotado, pero sensible por sesión/token y redirecciones hash.
- Señales: fuerte uso de selectores y submit manual, pero superficie pequeña.

### 8.2 Dashboard
- Riesgo: **medio**.
- Motivos: render relativamente claro; depende de quick actions + RBAC + summary API.

### 8.3 Products
- Riesgo: **medio-alto**.
- Motivos: tabla + filtros + paginación + modales + gestión de oferta integrada.
- Nota: “offers” no aparece como ruta independiente en router; hoy vive acoplado al flujo de products.

### 8.4 Categories
- Riesgo: **medio-alto**.
- Motivos: estado completo con filtros/paginación, múltiples templates modal y bindings manuales.

### 8.5 Offers
- Riesgo: **medio** (como subdominio dentro de Products).
- Motivos: alta dependencia en formularios/modales de products; no hay boundary aislado por ruta.

### 8.6 Users / Roles
- Riesgo: **alto**.
- Motivos: módulo más complejo (tabs, usuarios, roles, permisos, guardas admin, matrices RBAC).

### 8.7 Settings
- Riesgo: **alto**.
- Motivos: formulario muy extenso, gran densidad de campos/validaciones/estados y coupling con permisos write.

## 9. Orden recomendado de migración (si se decide migrar)
Orden solicitado y validado por riesgo incremental:

1. **Login**
   - objetivo: validar bootstrapping React + auth básico + redirección sin tocar módulos pesados.
2. **Dashboard**
   - objetivo: validar patrones de carga/estado + RBAC read.
3. **Products**
   - objetivo: primer módulo CRUD complejo, incluyendo offers acopladas.
4. **Categories**
   - objetivo: consolidar patrón CRUD/listas/paginación reusable.
5. **Offers**
   - objetivo: desacoplar dominio oferta de la UI legacy de products (si se decide mantenerlo separado conceptualmente).
6. **Users / Roles**
   - objetivo: migrar el bloque de mayor complejidad RBAC cuando el framework de módulos React ya esté probado.
7. **Settings**
   - objetivo: último módulo por criticidad de formularios masivos y riesgo de regresión UX.

## 10. Recomendación final
**Recomendación: escenario B (migración parcial por módulos), no migración total inmediata.**

Fundamento:
- El admin actual no está “roto”; tiene estructura modular y capa auth/api reutilizable.
- El mayor dolor no es de disponibilidad, sino de escalabilidad de mantenimiento UI DOM-driven.
- El riesgo funcional de un “big bang” es alto, especialmente en Users/Roles y Settings.
- La estrategia por módulos permite capturar valor real de React sin comprometer estabilidad global.

Si el roadmap de próximos 2–3 sprints no requiere cambios UI complejos en admin, una variante válida es **postergar el inicio** y mantener vanilla temporalmente (A), revisando decisión con métricas objetivas.

## 11. Criterios objetivos para reabrir o postergar la migración

### Señales para **iniciar/reabrir** migración
1. Más de 2 módulos del admin con roadmap activo de cambios UI complejos en el próximo trimestre.
2. Aumento sostenido de tiempo de entrega por tareas front admin (baseline vs últimos sprints).
3. Incidentes recurrentes por regresiones de bindings/DOM/RBAC visual en cambios menores.
4. Disponibilidad de suite mínima E2E para login, navegación, CRUD core y permisos.
5. Capacidad de equipo para sostener convivencia vanilla+React durante transición.

### Señales para **postergar**
1. Prioridad principal del negocio fuera del admin en los próximos sprints.
2. Falta de capacidad de QA/E2E para absorber riesgo de migración.
3. Necesidad inmediata de estabilidad operativa sin ventana de hardening.

## 12. Cierre ejecutivo
- No hay evidencia de urgencia técnica para migración total inmediata.
- Sí hay evidencia de que el costo de mantenimiento crecerá si el admin incrementa complejidad funcional.
- Decisión más robusta hoy: **migración parcial, progresiva y guiada por riesgo**, iniciando por Login/Dashboard y dejando Users/Roles/Settings para etapas de madurez.
