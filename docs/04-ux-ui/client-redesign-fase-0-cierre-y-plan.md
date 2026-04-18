---
status: Aprobado
owner: Product/UX + Frontend Lead
last_update: 2026-04-18
scope: Acta formal de cierre de Fase 0 UX/UI del CLIENT y plan oficial de fases del rediseño incremental.
---

# CLIENT UX/UI Redesign — Cierre Fase 0 y plan oficial de fases

## 1) Resumen ejecutivo
Se deja asentado formalmente que la **Fase 0 del rediseño UX/UI del CLIENT** quedó **cerrada y aprobada**.

Con este cierre:
- El **Foundation PR #203** (`client/foundation: introduce visual tokens v2 and core UI primitives`) queda tomado como **base aprobada**.
- Quedan **congeladas** la dirección visual principal, la stack visual/técnica y la forma de trabajo.
- Se confirma que la ejecución continúa con una **estrategia incremental por fases** para no romper contratos vigentes del client.
- El siguiente bloque oficial es **Fase 1 — Home**.

## 2) Estado actual
### 2.1 Diagnóstico técnico confirmado
El CLIENT opera con una arquitectura híbrida:
- shell HTML imperativo
- React montado en `#main-content`

Se ratifican contratos no rompibles durante el rediseño:
- rutas hash
- carrito en `localStorage`
- evento `cart:updated`
- `id`/`data-*` hooks críticos de integración

Decisión de trabajo confirmada: **migración incremental por fases** (no big-bang).

### 2.2 Estado de fase
- **Fase 0 UX/UI**: cerrada.
- **Foundation**: aprobado como baseline operativo.
- **Fase 1**: habilitada con foco en Home.

## 3) Decisiones cerradas en Fase 0
### 3.1 Foundation aprobado
Se aprueba formalmente el **PR #203**:
- `client/foundation: introduce visual tokens v2 and core UI primitives`

Este PR se toma como base para los siguientes entregables del rediseño del CLIENT.

### 3.2 Stack visual/técnica congelada (baseline oficial)
Stack aprobada:
- React + JSX
- CSS Modules
- Design tokens con CSS variables
- `lucide-react`
- `motion-one`
- `floating-ui`
- `focus-trap`
- Radix selectivo

Tecnologías explícitamente descartadas como base principal:
- Tailwind + shadcn/ui
- Material UI
- Chakra UI

### 3.3 Dirección visual principal congelada
Se confirma **Honest Greens** como referencia visual principal.

Dirección visual aprobada para el CLIENT:
- gastronómica
- moderna
- cálida
- editorial
- premium sobria
- mobile-first
- orientada a conversión rápida

### 3.4 Componentes base delimitados conceptualmente
Queda delimitado el set base conceptual para el sistema UI del CLIENT:
- AppShell / PageContainer
- Section / SectionHeader
- Button / IconButton
- Card / Surface
- Badge / StatusBadge
- Input / SearchInput
- FilterChip
- Modal / Drawer
- Price / DiscountBadge
- QuantityStepper
- Empty / Error / Loading State
- Header / Footer wrappers

## 4) Plan oficial por fases del rediseño del CLIENT
Orden oficial confirmado:
0. Foundation
1. **Fase 1 — Home**
2. Fase 2 — Header
3. Fase 3 — Footer
4. Fase 4 — Products
5. Fase 5 — Cart
6. Fase 6 — Confirm
7. Fase 7 — Quiénes somos
8. Fase 8 — Contacto

## 5) Próximo paso correcto
El próximo paso oficial es **iniciar Fase 1 — Home** sobre la base Foundation aprobada, manteniendo:
- contratos no rompibles del client
- estrategia incremental por fases
- foco exclusivo en alcance de Home (sin abrir implementación de fases posteriores)

## 6) Criterio de gobernanza documental
Este documento es la constancia formal de estado para UX/UI del CLIENT.

Si existiera contradicción con notas previas no normativas, prevalece este acta para:
- estado de cierre de Fase 0
- baseline Foundation aprobado
- plan oficial de fases
