# La Fileto - Admin Visual Brief

## Estado

Documento base de direccion visual y operativa para la futura refactorizacion del Admin de Menu Digital - La Fileto.

Este documento no implementa codigo ni autoriza cambios funcionales.

Su objetivo es mantener una direccion consistente entre futuros PRs del Admin, evitar decisiones visuales improvisadas y reducir repeticion de criterios en los prompts de Codex.

Esta revision reemplaza la direccion visual anterior de Admin oscuro por una direccion clara, calida, profesional y operativa.

## Alcance

Aplica unicamente a:

`apps/admin`

Aplica a futuras tareas visuales, de UX, accesibilidad, layout, tablas, formularios, navegacion, dashboard, modales, acciones por iconos y estados de interfaz del Admin.

No aplica al Client publico, salvo para mantener coherencia de marca general.

No aplica a Backend salvo que un bloqueo contractual sea demostrado con evidencia.

## Proposito del Admin

El Admin es una herramienta operativa para gestionar el negocio.

Su objetivo principal no es generar antojo ni vender directamente. Debe permitir trabajar rapido, con claridad, control y confianza.

El Admin debe ayudar a gestionar:

- productos;
- categorias;
- ofertas;
- usuarios;
- roles y permisos;
- configuracion;
- estado operativo del negocio;
- informacion comercial.

## Relacion con el Client publico

El Client publico y el Admin comparten la marca La Fileto, pero no deben tener la misma logica visual.

Client publico:

- gastronomico;
- calido;
- comercial;
- centrado en producto;
- centrado en antojo;
- centrado en pedido.

Admin:

- operativo;
- profesional;
- claro;
- calido;
- rapido de escanear;
- centrado en informacion;
- centrado en control;
- centrado en tareas repetidas;
- centrado en claridad de estados y acciones.

El Admin no debe copiar literalmente la estetica del Client publico.

## Concepto rector

La Fileto Admin - Operacion clara y controlada.

La interfaz debe transmitir:

- rapidez;
- orden;
- confianza;
- jerarquia;
- consistencia;
- lectura rapida;
- control del negocio;
- bajo riesgo de error;
- claridad de permisos;
- eficiencia en desktop;
- uso funcional en mobile/tablet.

Debe evitar:

- dashboard promocional;
- hero grandes;
- exceso de cards;
- estetica de plantilla generica;
- apariencia de dashboard administrativo sin identidad;
- tablas dificiles de leer;
- formularios largos sin agrupacion;
- acciones ambiguas;
- iconos sin significado claro;
- ornamento visual innecesario.

## Principios visuales

1. Operacion antes que decoracion.

2. Densidad util antes que aire vacio.

3. La jerarquia debe indicar que requiere atencion, que es una accion y que es informacion secundaria.

4. Las acciones frecuentes deben estar visibles y ser rapidas.

5. Las acciones destructivas deben ser distinguibles y confirmadas cuando el flujo actual ya lo requiera.

6. Los estados deben entenderse sin depender unicamente del color.

7. La navegacion debe ser estable, clara y accesible.

8. Los listados deben priorizar lectura, filtros, busqueda, estado y acciones.

9. Mobile debe ser funcional, no una reduccion visual defectuosa de desktop.

10. Todo control icon-only debe tener nombre accesible, foco visible y area tactil suficiente.

## Identidad visual

### Color

La base visual del Admin debe ser clara, calida y profesional.

No usar negro puro ni fondos oscuros dominantes como direccion principal del Admin.

Tokens objetivo:

- Canvas calido claro: `#FFF9F1`;
- Superficies principales: `#FFFFFF`;
- Superficies calidas secundarias: `#FFF3E4`;
- Bordes suaves: `#E8D8C4`;
- Texto principal: `#261A13`;
- Texto secundario: `#6A584B`;
- Accion principal: `#B45309`;
- Hover de accion principal: `#9A4D0B`;
- Exito: `#126B44`;
- Advertencia: `#A86000`;
- Peligro: `#B42318`.

El naranja se reserva para:

- CTA principal;
- foco;
- informacion importante;
- estados o indicadores que realmente requieran atencion.

No usar naranja para todas las acciones de fila. Las acciones de fila deben ser neutrales en reposo, con estado de peligro solo en hover, focus o confirmacion cuando corresponda.

Usar colores semanticos consistentes para:

- exito;
- alerta;
- peligro;
- informacion;
- estado neutral;
- elementos deshabilitados.

No usar colores funcionales solo como decoracion.

No depender exclusivamente del color para comunicar estado.

No introducir una paleta nueva sin justificarla y validarla contra tokens existentes.

El `theme-color` del navegador debe alinearse con el canvas calido claro real del Admin.

### Tipografia

Usar una escala contenida y operativa.

Jerarquia de peso objetivo:

- titulos: `700`;
- labels: `600`;
- datos: `400`;
- contexto secundario: `400`.

Prioridades:

- titulos de pagina medianos;
- encabezados de seccion claros;
- labels persistentes;
- tablas legibles;
- numeros y metricas faciles de escanear;
- textos auxiliares menos prominentes;
- mensajes de error y exito claros.

Evitar titulos hero excesivos o jerarquias visuales propias del Client publico.

### Spacing, densidad y movimiento

El Admin debe tener mas aire consistente que la version anterior, sin convertirse en una landing.

Reglas:

- evitar margenes verticales excesivos;
- toolbar y filtros con spacing suficiente;
- mantener aire suficiente para no saturar;
- agrupar informacion relacionada;
- evitar cards dentro de cards sin necesidad;
- usar espacio para separar contexto, accion y resultado;
- aprovechar 1366, 1440 y 1920 sin expandir contenido sin criterio;
- usar bordes finos;
- usar sombras suaves;
- reducir contrastes duros;
- usar hover y focus elegantes.

Las microinteracciones actuales deben cubrirse con CSS:

- transiciones de `200ms`;
- propiedades explicitas, no `transition: all`;
- foco visible mediante `:focus-visible`;
- preferencia `prefers-reduced-motion` respetada.

No agregar librerias de animacion para resolver microinteracciones de esta fase.

### Copy

El copy debe ser argentino, claro y directo.

Cada modulo puede incluir explicaciones breves cuando ayuden a trabajar mejor, especialmente en estados vacios, errores, permisos, bloqueos y validaciones.

Evitar textos promocionales, tono de landing o explicaciones largas que dificulten la operacion.

## Layout y shell

### Header y navegacion

El Header y Drawer son parte central de la operacion.

Deben permitir:

- identificar seccion actual;
- navegar rapidamente;
- conocer usuario y rol actual;
- acceder a logout;
- mantener acceso a modulos permitidos;
- funcionar correctamente en desktop, tablet y mobile.

Reglas obligatorias:

- el Drawer cerrado no debe dejar controles focusables;
- el Drawer abierto debe mantener foco controlado;
- Escape debe cerrarlo;
- el foco debe volver al disparador al cerrar;
- `aria-hidden` debe reflejar el estado real;
- body lock debe funcionar mientras este abierto;
- navegacion hash debe mantenerse;
- estados activos deben ser claros.

### Landmarks

Debe existir un solo landmark `main` estable por vista.

Evitar landmarks `main` anidados entre app shell, router y paginas.

## Dashboard

El Dashboard debe ser operativo, compacto y basado solo en datos existentes.

Debe priorizar:

1. Estado operativo del negocio.
2. Metricas principales.
3. Pendientes que requieren atencion.
4. Acciones rapidas.
5. Frescura del dato.
6. Actividad disponible o estado explicito de ausencia de actividad.

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

- banda compacta de metricas;
- prioridad para productos sin imagen;
- estado abierto/cerrado claro;
- proximo cambio visible si existe;
- `generatedAt` como indicador de frescura;
- acciones rapidas compactas;
- no usar hero grande;
- no usar cards grandes sin valor operativo.

No inventar:

- ventas;
- ingresos;
- pedidos en vivo;
- ranking de productos;
- tendencias temporales;
- auditoria de usuarios;

sin Backend o contratos nuevos.

## Listados, tablas y toolbar

Products y Categories deben usar una gramatica visual comun.

La superficie principal de CRUD en desktop debe ser tabla o listado operativo.

La toolbar debe poder contener:

- titulo;
- contador o contexto de resultados;
- busqueda;
- filtros;
- accion primaria;
- acciones secundarias cuando sean necesarias.

Principios:

- busqueda visible;
- filtros claros;
- estado de resultados entendible;
- badges sobrios;
- filas compactas;
- columnas legibles;
- acciones alineadas de forma consistente;
- paginacion estable y visible si existe;
- estados loading, empty, error y success coherentes.

Mobile:

- mantener tabla solo si sigue siendo legible;
- usar cards/listas moviles si ofrece mejor usabilidad;
- mantener el mismo orden logico de informacion y acciones;
- evitar scroll horizontal innecesario;
- preservar filtros y estados.

## Products

Products debe priorizar informacion accionable y lectura rapida.

Datos visibles esperados:

- producto;
- categoria;
- descripcion;
- precio;
- stock;
- publicacion;
- oferta.

Alertas y bloqueos deben explicarse sin depender solo del color:

- si `precio <= 0`, mostrar "Precio pendiente";
- si `stock <= 0`, mostrar "Sin stock";
- si el producto no es publicable, mostrar una explicacion clara del motivo.

No considerar invalido un precio bajo. Solo `precio <= 0` bloquea publicacion por precio pendiente.

Acciones permanentes esperadas en fila o card:

- Ver: `Eye`;
- Editar: `Pencil`;
- Eliminar: `Trash2`.

Las acciones deben ser neutrales en reposo.

La accion de eliminar debe expresar peligro en hover, focus o confirmacion, no como color permanente de reposo.

No dejar acciones de oferta permanentes en fila o card. La oferta se administra dentro de Editar producto.

## Estado y publicacion

La decision de negocio objetivo para Products es:

- Activo;
- Inactivo.

Al desactivar un producto:

- deja de mostrarse en el Client;
- conserva sus datos editables en Admin.

Activar un producto requiere:

- `precio > 0`;
- `stock > 0`.

Esta revision no decide todavia el mapeo tecnico de `DRAFT`, `ACTIVE` y `ARCHIVED`.

Fase R1 debe auditar schema, endpoints, migraciones, datos existentes y tests antes de cambiar Backend o Base de datos.

Ningun PR visual debe cambiar estados persistidos, endpoints, payloads, migraciones o contratos de publicacion sin una auditoria contractual previa.

## Oferta

La oferta se administra dentro de Editar producto.

El editor debe incluir un switch:

- "Aplicar oferta".

Al activarlo, debe permitir:

- porcentaje;
- vigencia desde/hasta si el contrato lo soporta;
- vista previa de precio final.

Quitar oferta debe ser una accion explicita y confirmada.

En Crear producto, la oferta solo se habilitara en el mismo flujo si R1 demuestra un flujo seguro producto + oferta.

El modal Ver solo informa la oferta existente; no la modifica.

## Acciones por iconos

Las acciones por iconos se usaran para operaciones frecuentes en Products y Categories.

Reglas obligatorias:

- usar `button` real;
- `aria-label` obligatorio;
- tooltip o nombre accesible equivalente;
- foco visible;
- area tactil minima de 40px, idealmente 44px en mobile;
- disabled claro;
- no depender solo del color;
- orden consistente desktop y mobile;
- iconos no ambiguos;
- conservar confirmacion existente en acciones destructivas.

Patron esperado:

Products:

- ver: `Eye`;
- editar: `Pencil`;
- eliminar: `Trash2`.

Categories:

- editar: `Pencil`;
- activar/desactivar: `Eye` o `EyeOff`, o equivalente claramente etiquetado;
- eliminar: `Trash2`.

El icono debe describir la accion, no solo el objeto.

Ejemplos de nombres accesibles:

- Ver producto `{name}`
- Editar producto `{name}`
- Eliminar producto `{name}`
- Editar categoria `{name}`
- Activar categoria `{name}`
- Desactivar categoria `{name}`
- Eliminar categoria `{name}`

## Formularios

Los formularios deben ser claros, agrupados y previsibles.

Reglas:

- labels persistentes;
- ayuda breve;
- validacion inline;
- mensajes de error claros;
- no depender solo de placeholders;
- secciones agrupadas por intencion;
- acciones de guardar/cancelar visibles;
- sticky actions solo cuando aporten a formularios largos;
- conservar datos y feedback existente;
- no mezclar cambios visuales con cambios de payload o endpoint.

Settings requiere una pasada especifica por formularios largos.

No tocar contratos Admin -> Backend -> Client sin un PR contractual separado.

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

- que ocurre;
- que puede hacer el usuario;
- cual es el siguiente paso;
- si la accion esta bloqueada por permiso, datos o conectividad.

## Modales y confirmaciones

Los modales deben tener comportamiento accesible consistente.

Reglas obligatorias:

- titulo accesible obligatorio;
- `aria-modal` correcto;
- focus trap;
- foco inicial coherente;
- retorno del foco al disparador;
- Escape segun el flujo;
- cierre claro;
- acciones destructivas diferenciadas;
- no usar `innerHTML` para construir UI nueva sin una justificacion tecnica.

Antes de ampliar acciones destructivas por iconos, debe existir una base de dialogos/focus trap consistente.

## RBAC y permisos

La interfaz debe reflejar las capacidades reales del Backend.

Reglas:

- no mostrar acciones que Backend rechaza sistematicamente;
- separar permiso visible de capacidad efectiva;
- explicar restricciones de forma clara;
- preservar guards existentes;
- preservar `role-admin` y contratos Backend;
- no modificar roles, permisos ni endpoints desde un PR visual.

Users/Roles requiere una fase propia despues de revisar y alinear el contrato visual con el contrato efectivo.

## Accesibilidad

Criterios minimos:

- navegacion completa por teclado;
- foco visible;
- contraste suficiente;
- drawer sin elementos focusables invisibles;
- dialogos con focus trap;
- controles icon-only con nombre accesible;
- touch targets adecuados;
- labels en inputs;
- errores asociados a campos;
- no depender solo de color;
- imagenes con dimensiones o wrappers estables cuando corresponda;
- evitar overflow horizontal;
- respetar reduced motion cuando se agreguen transiciones;
- evitar `outline: none` sin reemplazo visible;
- usar `:focus-visible` para foco de teclado;
- usar `aria-live="polite"` en feedback asincronico cuando aplique.

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

## Librerias

Mantener Lucide React.

No incorporar ahora:

- Shadcn;
- Radix;
- TanStack Table;
- Sonner;
- Framer Motion.

CSS cubre las microinteracciones actuales.

Cualquier dependencia futura requiere PR propio y auditoria propia.

## Benchmark externo

La referencia externa analizada sirve como benchmark de:

- sidebar persistente en desktop;
- navegacion mobile colapsada;
- tablas compactas;
- busqueda superior;
- filtros;
- badges de estado;
- paginacion explicita;
- acciones compactas por fila;
- densidad operativa;
- preservacion de estado en URL cuando corresponda.

No se debe copiar literalmente:

- marca;
- textos;
- rutas;
- assets;
- layout exacto;
- modulos ajenos al dominio restaurante;
- estetica clara generica;
- icon-only sin nombre accesible;
- tablas mobile ilegibles.

La implementacion de La Fileto debe ser mas accesible que el benchmark.

## Contratos no rompibles

Los futuros PRs visuales Admin no deben romper:

- rutas hash existentes;
- `auth_token`;
- sesion actual;
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
- navegacion Header/Drawer;
- contratos Admin/Backend;
- Settings funcional;
- endpoints actuales.

## Plan revisado

La implementacion futura debe avanzar por PRs chicos y auditables.

Orden recomendado:

1. PR 10C-0R Admin visual brief revision.
2. Fase R1 auditoria Product / Offer / Status.
3. PR 10C-6D0 migracion contractual, solo si R1 la exige.
4. PR 10C-6A warm light Admin visual foundation.
5. PR 10C-6B Products hierarchy and list visual refinement.
6. PR 10C-6C Products actions: View / Edit / Delete.
7. PR 10C-6D Product editor: status and offer consolidation.
8. PR 10C-7 Categories operational list + icon actions.
9. PR 10C-8 Dashboard operativo compacto.
10. PR 10C-9 Users / Roles operational clarity.
11. PR 10C-10 Settings long-form polish.
12. PR 10C-11 Global cleanup.

Este documento no autoriza implementar todas las fases juntas.

Cada PR futuro debe tener scope explicito, contratos preservados, verificaciones y auditoria post-PR.

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
- cambiar sesion;
- cambiar feature flags;
- cambiar CRUDs;
- cambiar filtros/hash/paginacion sin PR especifico;
- instalar dependencias nuevas sin justificacion explicita;
- copiar literalmente la referencia externa;
- copiar literalmente la estetica del Client publico;
- mezclar Dashboard, shell, CRUDs y Settings en un mismo PR;
- usar iconos sin nombre accesible;
- declarar `APTO` sin evidencia.

## Criterio de aceptacion visual general

Un futuro PR visual Admin es aceptable si:

- respeta este brief;
- mejora operacion, claridad y accesibilidad;
- no rompe contratos;
- no mezcla superficies fuera de scope;
- mantiene responsive;
- mantiene navegacion por teclado;
- pasa tests y build requeridos;
- termina con dictamen `APTO` / `APTO CON OBSERVACIONES` / `NO APTO`.
