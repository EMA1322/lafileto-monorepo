# Contrato visual base: `admin-list`

> Estado: **vigente para nuevas implementaciones** y **referencia para migración gradual** de módulos legacy.
>
> Alcance de este contrato: páginas de listado del admin (ej. Products, Categories, Users).

## Objetivo

Definir un contrato explícito y reutilizable para pantallas tipo listado, alineando:

- Header + CTA principal.
- Toolbar de filtros/acciones.
- Tabla de resultados (espaciado, gutters y overflow).
- Columna de acciones por fila.

Este documento **no cambia lógica de datos** y no exige migración inmediata del markup existente.

---

## 1) Header contract

### Estructura canónica

- Contenedor raíz del módulo listado: `.adminList`.
- Bloque de cabecera: `.adminList__header`.
- Fila principal (título + CTA): `.adminList__titleRow`.
- Título: `.adminList__heading`.
- Subtítulo/meta opcional: `.adminList__subtitle`.
- CTA principal (crear): `.adminList__cta`.

### Reglas

- El título y subtítulo se alinean a la izquierda.
- La CTA “Crear …” se alinea a la derecha, sin romper en desktop.
- En viewport chico, la CTA puede bajar de línea manteniendo jerarquía visual.

---

## 2) Toolbar contract

### Estructura canónica

- Toolbar: `.adminList__toolbar`.
- Grupo de controles: `.adminList__toolbarGroup`.
- Variante de grupo ancho (búsqueda): `.adminList__toolbarGroup--wide`.
- Acciones de toolbar: `.adminList__toolbarActions`.
- Botón “Limpiar filtros”: `.adminList__clearFilters` + classes de botón del kit.

### Reglas

- Layout responsive con grid de 12 columnas.
- En mobile, cada grupo ocupa ancho completo.
- En desktop:
  - controles regulares: 3 columnas;
  - búsqueda (wide): 6 columnas;
  - acciones: 3 columnas alineadas a la derecha.
- “Limpiar filtros” usa estilo **ghost small** del design kit (`.btn .btn--ghost .btn--sm`).

---

## 3) Table contract

### Estructura canónica

- Wrapper: `.adminList__tableWrap`.
- Tabla: `.adminList__table`.
- Cabecera de acciones: `.adminList__th--actions`.
- Celda de acciones: `.adminList__td--actions`.

### Reglas

- Wrapper con borde, radio y overflow horizontal controlado (`overflow-x: auto`).
- Tabla con `min-width` para preservar legibilidad en columnas múltiples.
- `th/td` usan padding canónico basado en tokens.
- La columna “Acciones” no debe expandirse innecesariamente (`width: 1%`, `nowrap`).

---

## 4) Actions contract

### Estructura canónica

- Contenedor de acciones por fila: `.adminList__rowActions`.
- Acción individual: `.adminList__actionBtn` + clase de botón del kit.

### Orden recomendado (fijo)

1. Ver/Detalle (si aplica)
2. Editar
3. Estado secundario (activar/desactivar, reset, etc.)
4. Eliminar (destructiva)

### Reglas

- Mantener tamaños consistentes (preferencia: `.btn--sm` en contexto de tabla).
- Acciones destructivas al final del grupo.
- Priorizar variantes del design kit vigente (`.btn--primary`, `.btn--outline`, `.btn--ghost`, `.btn--sm`, `.btn--icon`).

---

## 5) Legacy classes deprecadas y reemplazos

Las siguientes clases legacy se detectan en módulos actuales y se consideran **deprecadas** para nuevas pantallas/migraciones:

- `.btn-secondary` → usar `.btn--outline` o `.btn--ghost` según jerarquía.
- `.btn-danger` → usar `.btn` + variante semántica vigente del kit (cuando se formalice `danger` en el sistema) o fallback temporal documentado por módulo.
- `.btn-tertiary` → usar `.btn--ghost`.

> Nota: el objetivo de este PR es **documentar y preparar** el contrato. La sustitución efectiva en Products/Categories/Users se realizará en PRs posteriores.

---

## 6) Estrategia de adopción (sin ruptura)

- `admin-list.css` está diseñado como **opt-in**.
- Ningún selector pisa módulos existentes si no se agregan clases `.adminList*` al markup.
- La migración recomendada por módulo es incremental:
  1. adoptar layout (`header`, `toolbar`, `tableWrap`),
  2. normalizar acciones por fila,
  3. eliminar legacy classes.
