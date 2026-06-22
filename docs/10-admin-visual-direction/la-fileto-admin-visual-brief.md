# La Fileto — Admin Visual Brief

## Estado

Documento base de dirección visual y operativa para la futura refactorización del Admin de Menú Digital — La Fileto.

Este documento no implementa código ni autoriza cambios funcionales.

Su objetivo es mantener una dirección consistente entre futuros PRs del Admin, evitar decisiones visuales improvisadas y reducir repetición de criterios en los prompts de Codex.

## Alcance

Aplica únicamente a:

`apps/admin`

Aplica a futuras tareas visuales, de UX, accesibilidad, layout, tablas, formularios, navegación, dashboard, modales, acciones por iconos y estados de interfaz del Admin.

No aplica al Client público, salvo para mantener coherencia de marca general.

No aplica a Backend salvo que un bloqueo contractual sea demostrado con evidencia.

## Propósito del Admin

El Admin es una herramienta operativa para gestionar el negocio.

Su objetivo principal no es generar antojo ni vender directamente. Debe permitir trabajar rápido, con claridad, control y confianza.

El Admin debe ayudar a gestionar:

- productos;
- categorías;
- ofertas;
- usuarios;
- roles y permisos;
- configuración;
- estado operativo del negocio;
- información comercial.

## Relación con el Client público

El Client público y el Admin comparten la marca La Fileto, pero no deben tener la misma lógica visual.

Client público:

- gastronómico;
- cálido;
- comercial;
- centrado en producto;
- centrado en antojo;
- centrado en pedido.

Admin:

- operativo;
- profesional;
- oscuro;
- denso;
- centrado en información;
- centrado en control;
- centrado en tareas repetidas;
- centrado en claridad de estados y acciones.

El Admin no debe copiar literalmente la estética del Client público.

## Concepto rector

La Fileto Admin — Operación clara y controlada.

La interfaz debe transmitir:

- rapidez;
- orden;
- confianza;
- jerarquía;
- consistencia;
- lectura rápida;
- control del negocio;
- bajo riesgo de error;
- claridad de permisos;
- eficiencia en desktop;
- uso funcional en mobile/tablet.

Debe evitar:

- dashboard promocional;
- hero grandes;
- exceso de cards;
- estética de plantilla genérica;
- apariencia de dashboard administrativo sin identidad;
- tablas difíciles de leer;
- formularios largos sin agrupación;
- acciones ambiguas;
- iconos sin significado claro;
- ornamento visual innecesario.

## Principios visuales

1. Operación antes que decoración.

2. Densidad útil antes que aire vacío.

3. La jerarquía debe indicar qué requiere atención, qué es una acción y qué es información secundaria.

4. Las acciones frecuentes deben estar visibles y ser rápidas.

5. Las acciones destructivas deben ser distinguibles y confirmadas cuando el flujo actual ya lo requiera.

6. Los estados deben entenderse sin depender únicamente del color.

7. La navegación debe ser estable, clara y accesible.

8. Los listados deben priorizar lectura, filtros, búsqueda, estado y acciones.

9. Mobile debe ser funcional, no una reducción visual defectuosa de desktop.

10. Todo control icon-only debe tener nombre accesible, foco visible y área táctil suficiente.

## Sistema visual

### Color

Mantener una base oscura profesional ya presente en Admin.

Usar el amarillo de La Fileto de forma controlada:

- acción primaria;
- foco;
- estado destacado;
- información relevante;
- elementos de marca puntuales.

Usar colores semánticos consistentes para:

- éxito;
- alerta;
- peligro;
- información;
- estado neutral;
- elementos deshabilitados.

No usar colores funcionales solo como decoración.

No depender exclusivamente del color para comunicar estado.

No introducir una paleta nueva sin justificarla y validarla contra tokens existentes.

El theme-color del navegador debe alinearse con la base oscura real del Admin.

### Tipografía

Usar una escala contenida y operativa.

Prioridades:

- títulos de página medianos;
- encabezados de sección claros;
- labels persistentes;
- tablas legibles;
- números y métricas fáciles de escanear;
- textos auxiliares menos prominentes;
- mensajes de error y éxito claros.

Evitar títulos hero excesivos o jerarquías visuales propias del Client público.

### Spacing y densidad

El Admin debe tener más densidad que el Client público.

Reglas:

- evitar márgenes verticales excesivos;
- priorizar toolbars compactas;
- mantener aire suficiente para no saturar;
- agrupar información relacionada;
- evitar cards dentro de cards sin necesidad;
- usar espacio para separar contexto, acción y resultado;
- aprovechar 1366, 1440 y 1920 sin expandir contenido sin criterio.

## Layout y shell

### Header y navegación

El Header y Drawer son parte central de la operación.

Deben permitir:

- identificar sección actual;
- navegar rápidamente;
- conocer usuario y rol actual;
- acceder a logout;
- mantener acceso a módulos permitidos;
- funcionar correctamente en desktop, tablet y mobile.

Reglas obligatorias:

- el Drawer cerrado no debe dejar controles focusables;
- el Drawer abierto debe mantener foco controlado;
- Escape debe cerrarlo;
- el foco debe volver al disparador al cerrar;
- `aria-hidden` debe reflejar el estado real;
- body lock debe funcionar mientras esté abierto;
- navegación hash debe mantenerse;
- estados activos deben ser claros.

### Landmarks

Debe existir un solo landmark `main` estable por vista.

Evitar landmarks `main` anidados entre app shell, router y páginas.

## Dashboard

El Dashboard debe ser operativo, compacto y basado solo en datos existentes.

Debe priorizar:

1. Estado operativo del negocio.
2. Métricas principales.
3. Pendientes que requieren atención.
4. Acciones rápidas.
5. Frescura del dato.
6. Actividad disponible o estado explícito de ausencia de actividad.

Datos existentes que pueden aprovecharse en futuros PRs:

- `activeProducts`;
- `activeCategories`;
- `activeOffers`;
- `offerPercent`;
- `productsWithoutImage`;
- `business.isOpen`;
- `status.mode`;
- `business.nextChangeAt`;
- `activity.note`;
- `generatedAt`.

Prioridades visuales:

- banda compacta de métricas;
- prioridad para productos sin imagen;
- estado abierto/cerrado claro;
- próximo cambio visible si existe;
- `generatedAt` como indicador de frescura;
- acciones rápidas compactas;
- no usar hero grande;
- no usar cards grandes sin valor operativo.

No inventar:

- ventas;
- ingresos;
- pedidos en vivo;
- ranking de productos;
- tendencias temporales;
- auditoría de usuarios;

sin Backend o contratos nuevos.

## Listados, tablas y toolbar

Products y Categories deben usar una gramática visual común.

La superficie principal de CRUD en desktop debe ser tabla o listado operativo.

La toolbar debe poder contener:

- título;
- contador o contexto de resultados;
- búsqueda;
- filtros;
- acción primaria;
- acciones secundarias cuando sean necesarias.

Principios:

- búsqueda visible;
- filtros claros;
- estado de resultados entendible;
- badges sobrios;
- filas compactas;
- columnas legibles;
- acciones alineadas de forma consistente;
- paginación estable y visible si existe;
- estados loading, empty, error y success coherentes.

Mobile:

- mantener tabla solo si sigue siendo legible;
- usar cards/listas móviles si ofrece mejor usabilidad;
- mantener el mismo orden lógico de información y acciones;
- evitar scroll horizontal innecesario;
- preservar filtros y estados.

## Acciones por iconos

Las acciones por iconos se usarán para operaciones frecuentes en Products y Categories.

Reglas obligatorias:

- usar `button` real;
- `aria-label` obligatorio;
- tooltip o nombre accesible equivalente;
- foco visible;
- área táctil mínima de 40px, idealmente 44px en mobile;
- disabled claro;
- no depender solo del color;
- orden consistente desktop y mobile;
- iconos no ambiguos;
- conservar confirmación existente en acciones destructivas.

Patrón esperado:

Products:

- editar: `Pencil`;
- eliminar: `Trash2`;
- crear oferta: `BadgePercent` o `Tag`;
- editar oferta: icono de oferta coherente;
- quitar oferta: `TagX` o acción equivalente clara.

Categories:

- editar: `Pencil`;
- activar/desactivar: `Eye` o `EyeOff`, o equivalente claramente etiquetado;
- eliminar: `Trash2`.

El icono debe describir la acción, no solo el objeto.

Ejemplos de nombres accesibles:

- Editar producto `{name}`
- Eliminar producto `{name}`
- Crear oferta para `{name}`
- Editar oferta de `{name}`
- Quitar oferta de `{name}`
- Editar categoría `{name}`
- Activar categoría `{name}`
- Desactivar categoría `{name}`
- Eliminar categoría `{name}`

## Formularios

Los formularios deben ser claros, agrupados y previsibles.

Reglas:

- labels persistentes;
- ayuda breve;
- validación inline;
- mensajes de error claros;
- no depender solo de placeholders;
- secciones agrupadas por intención;
- acciones de guardar/cancelar visibles;
- sticky actions solo cuando aporten a formularios largos;
- conservar datos y feedback existente;
- no mezclar cambios visuales con cambios de payload o endpoint.

Settings requiere una pasada específica por formularios largos.

No tocar contratos Admin → Backend → Client sin un PR contractual separado.

## Estados de interfaz

Los estados deben usar patrones compartidos:

- loading;
- empty;
- error;
- success;
- disabled;
- no autorizado;
- sin permisos;
- sin resultados.

Cada estado debe explicar:

- qué ocurre;
- qué puede hacer el usuario;
- cuál es el siguiente paso;
- si la acción está bloqueada por permiso, datos o conectividad.

## Modales y confirmaciones

Los modales deben tener comportamiento accesible consistente.

Reglas obligatorias:

- título accesible obligatorio;
- `aria-modal` correcto;
- focus trap;
- foco inicial coherente;
- retorno del foco al disparador;
- Escape según el flujo;
- cierre claro;
- acciones destructivas diferenciadas;
- no usar `innerHTML` para construir UI nueva sin una justificación técnica.

Antes de ampliar acciones destructivas por iconos, debe existir una base de diálogos/focus trap consistente.

## RBAC y permisos

La interfaz debe reflejar las capacidades reales del Backend.

Reglas:

- no mostrar acciones que Backend rechaza sistemáticamente;
- separar permiso visible de capacidad efectiva;
- explicar restricciones de forma clara;
- preservar guards existentes;
- preservar `role-admin` y contratos Backend;
- no modificar roles, permisos ni endpoints desde un PR visual.

Users/Roles requiere una fase propia después de revisar y alinear el contrato visual con el contrato efectivo.

## Accesibilidad

Criterios mínimos:

- navegación completa por teclado;
- foco visible;
- contraste suficiente;
- drawer sin elementos focusables invisibles;
- diálogos con focus trap;
- controles icon-only con nombre accesible;
- touch targets adecuados;
- labels en inputs;
- errores asociados a campos;
- no depender solo de color;
- imágenes con dimensiones o wrappers estables cuando corresponda;
- evitar overflow horizontal;
- respetar reduced motion cuando se agreguen transiciones.

## Responsive

Viewports de referencia:

- 360;
- 390;
- 768;
- 1024;
- 1366;
- 1440;
- 1920.

Principios:

- desktop debe aprovechar ancho sin perder lectura;
- tablet debe conservar densidad razonable;
- mobile debe priorizar acciones y contexto;
- no debe existir overflow horizontal del documento;
- tablas deben degradar a cards/listas cuando sea necesario;
- Header/Drawer deben conservar accesibilidad;
- touch targets deben funcionar en mobile.

## Benchmark externo

La referencia externa analizada sirve como benchmark de:

- sidebar persistente en desktop;
- navegación mobile colapsada;
- tablas compactas;
- búsqueda superior;
- filtros;
- badges de estado;
- paginación explícita;
- acciones compactas por fila;
- densidad operativa;
- preservación de estado en URL cuando corresponda.

No se debe copiar literalmente:

- marca;
- textos;
- rutas;
- assets;
- layout exacto;
- módulos ajenos al dominio restaurante;
- estética clara genérica;
- icon-only sin nombre accesible;
- tablas mobile ilegibles.

La implementación de La Fileto debe ser más accesible que el benchmark.

## Contratos no rompibles

Los futuros PRs visuales Admin no deben romper:

- rutas hash existentes;
- `auth_token`;
- sesión actual;
- `API_BASE=/api/v1`;
- proxy `/api`;
- RBAC;
- guards;
- `requireAdminRole` Backend;
- feature flag `VITE_FEATURE_SETTINGS`;
- CRUDs existentes;
- filtros en hash;
- logout;
- modal global;
- tests actuales;
- navegación Header/Drawer;
- contratos Admin/Backend;
- Settings funcional;
- endpoints actuales.

## Orden de implementación recomendado

La implementación futura debe avanzar por PRs chicos y auditables.

Orden recomendado:

1. Shell accessibility baseline.
2. Dialog accessibility foundation.
3. RBAC visual contract alignment.
4. Accessible IconAction primitive.
5. Shared list surface foundation.
6. Products operational list + icon actions.
7. Categories operational list + icon actions.
8. Dashboard operativo compacto.
9. Users/Roles operational clarity.
10. Settings long-form polish.
11. Admin global cleanup and consistency.

Este documento no autoriza implementar todas las fases juntas.

Cada PR futuro debe tener scope explícito, contratos preservados, verificaciones y auditoría post-PR.

## Prohibiciones generales

No hacer durante la fase visual Admin:

- migrar a Next.js;
- reescribir Admin desde cero;
- tocar Backend sin bloqueo real demostrado;
- cambiar endpoints;
- cambiar rutas hash;
- cambiar proxy `/api`;
- cambiar `API_BASE`;
- cambiar `auth_token`;
- cambiar sesión;
- cambiar feature flags;
- cambiar CRUDs;
- cambiar filtros/hash/paginación sin PR específico;
- instalar dependencias nuevas sin justificación explícita;
- copiar literalmente la referencia externa;
- copiar literalmente la estética del Client público;
- mezclar Dashboard, shell, CRUDs y Settings en un mismo PR;
- usar iconos sin nombre accesible;
- declarar `APTO` sin evidencia.

## Criterio de aceptación visual general

Un futuro PR visual Admin es aceptable si:

- respeta este brief;
- mejora operación, claridad y accesibilidad;
- no rompe contratos;
- no mezcla superficies fuera de scope;
- mantiene responsive;
- mantiene navegación por teclado;
- pasa tests y build requeridos;
- termina con dictamen `APTO` / `APTO CON OBSERVACIONES` / `NO APTO`.
