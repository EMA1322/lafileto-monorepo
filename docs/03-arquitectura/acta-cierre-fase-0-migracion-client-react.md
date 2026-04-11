---
status: Aprobado
owner: Tech Lead + Frontend Lead + Backend Lead
last_update: 2026-04-11
scope: Cierre formal de Fase 0 para migración incremental del client a React.
---

# Acta de cierre — Fase 0 de migración del client a React

## 1) Propósito
Formalizar el cierre de la **Fase 0** de arquitectura para habilitar la migración del **client** a React bajo una estrategia incremental, preservando continuidad operativa y sin alterar el alcance de runtime aprobado para backend y admin en esta etapa.

## 2) Decisión ejecutiva aprobada
Se aprueba avanzar a Fase 1 con una migración incremental del **client** hacia React, manteniendo backend y base de datos actuales, y conservando el admin fuera del alcance inicial.

Decisiones aprobadas (asentadas):
- Backend Express actual: se conserva.
- Prisma/MySQL actual: se conserva.
- Client vanilla: se reemplaza progresivamente por React.
- Admin vanilla: se mantiene sin migración inicial.
- JSON locales del client: salen del flujo productivo.
- Backend pasa a ser la única fuente de verdad del catálogo público.
- El client consumirá solo endpoints públicos versionados.
- El admin seguirá consumiendo endpoints protegidos.
- El formato de respuesta API se normaliza antes de migrar UI.
- El carrito permanece en frontend/localStorage en la primera etapa.
- React entra solo en apps/client.
- Primera migración: Home, Products, Cart, Confirm.
- Admin queda fuera de alcance inicial.
- No se rediseña DB en esta etapa.
- No se rehace backend completo.
- La migración será incremental, no big bang.
- Se mantendrá Vite.
- Se definirá una capa API compartida para el nuevo client.
- Se retirará legado solo cuando cada módulo React esté cerrado.
- Se usará hash routing en el nuevo client durante la transición.

## 3) Arquitectura objetivo aprobada
Arquitectura objetivo de transición:
- **Backend**: API Express existente, evolucionada por normalización de contratos públicos.
- **Datos**: Prisma + MySQL sin rediseño estructural en esta fase.
- **Client**: migración gradual desde vanilla hacia React dentro de `apps/client`.
- **Admin**: continuidad operativa en vanilla, sin migración inicial.
- **Build/runtime frontend**: continuidad con Vite.

## 4) Fuente de verdad por dominio
- **Catálogo público (productos, categorías, ofertas y configuración comercial pública)**: backend API.
- **Estado operativo público (disponibilidad/comercialización)**: backend API.
- **Carrito de compra (primera etapa)**: estado local en frontend (`localStorage`).
- **Gestión administrativa interna**: continúa en admin consumiendo endpoints protegidos.

## 5) Endpoints públicos aprobados
Endpoints oficiales de Fase 0 para consumo del client:
- `GET /api/v1/public/products`
- `GET /api/v1/public/categories`
- `GET /api/v1/public/offers`
- `GET /api/v1/public/settings`
- `GET /api/v1/public/business-status`
- `GET /api/v1/public/commercial-config`

## 6) Separación entre settings públicos y privados
- **Públicos**: configuración necesaria para renderizar y operar el client público.
- **Privados/protegidos**: configuración administrativa y operativa interna, de acceso restringido.
- Criterio aprobado: el client solo consume superficie pública versionada; el admin mantiene consumo de endpoints protegidos.

## 7) Política aprobada para imágenes
- Las imágenes de catálogo quedan gobernadas por datos expuestos por backend como fuente de verdad.
- Los JSON locales dejan de ser mecanismo productivo para resolver imágenes públicas.
- Cualquier fallback de transición se considera temporal y no sustituye la fuente de verdad del backend.

## 8) Estrategia de routing aprobada
- Durante la transición se utilizará **hash routing** en el nuevo client React.
- Esta decisión minimiza riesgo operativo en despliegues estáticos y evita dependencias tempranas de reconfiguración de infraestructura.

## 9) Alcance aprobado de la primera ola de migración
Módulos incluidos en la primera ola:
- Home
- Products
- Cart
- Confirm

Fuera de alcance inicial:
- Admin (sin migración inicial).
- Reescritura integral de backend.
- Rediseño de DB.

## 10) Reglas de transición aprobadas
- Migración incremental por módulo (no big bang).
- Coexistencia temporal de legado y React hasta cierre de cada módulo.
- Retiro de piezas legacy únicamente cuando el módulo React equivalente esté cerrado.
- Normalización del formato de respuesta API como prerrequisito de avance sostenido en UI.
- Definición de capa API compartida para desacoplar UI de detalles de transporte/contrato.

## 11) Qué se retira progresivamente
- Uso productivo de JSON locales del client como fuente de catálogo/configuración pública.
- Vistas/fragmentos legacy del client reemplazados por módulos React cerrados.
- Adaptaciones transitorias una vez estabilizados contratos públicos versionados.

## 12) Riesgos conocidos aceptados
- Riesgo de convivencia temporal entre enfoques legacy y React en `apps/client`.
- Riesgo de desalineación de contrato mientras se completa la normalización API.
- Riesgo de deuda temporal por fallback de datos durante ventanas de transición.
- Riesgo de regresiones funcionales en módulos parcialmente migrados.

Mitigación aprobada: avance por módulos cerrables, contratos públicos versionados y retiro controlado del legado.

## 13) Criterio de salida de Fase 0
La Fase 0 se considera cerrada cuando:
- Existe decisión ejecutiva aprobada y documentada.
- Se define arquitectura objetivo de transición sin rediseño de backend/DB.
- Se acuerdan endpoints públicos oficiales para client.
- Se establece fuente de verdad por dominio.
- Se fija el alcance inicial (Home, Products, Cart, Confirm) y exclusiones explícitas.
- Se aprueba estrategia de routing, build y transición incremental.

## 14) Habilitación de Fase 1
Con este acta queda **habilitada la apertura de Fase 1**, enfocada en ejecución incremental de migración del client React sobre el alcance inicial aprobado, sin extender alcance a admin ni rediseñar backend/DB en el arranque.

## 15) Veredicto de cierre
**Veredicto:** Fase 0 cerrada y aprobada.

La organización cuenta con definiciones arquitectónicas, límites de alcance y lineamientos de transición suficientes para iniciar Fase 1 de manera controlada.
