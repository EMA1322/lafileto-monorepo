---
status: Aprobado
owner: Tech Lead + Frontend Lead + Backend Lead
last_update: 2026-04-11
scope: Cierre breve de Fase 1 sobre contratos públicos entre client y backend.
---

# Cierre de Fase 1 — Contratos públicos client-backend

## 1. Propósito
Dejar constancia formal del cierre de la **Fase 1** respecto del saneamiento y estabilización de los contratos públicos entre **apps/client** y **apps/backend**, con foco en superficie pública activa, envelope de respuesta y límites de consumo.

## 2. Estado de cierre de Fase 1
La Fase 1 se declara **cerrada** para el frente de contratos públicos. El client opera sobre backend real para catálogo y configuración pública, con endpoints oficiales definidos y sin dependencia productiva de JSON locales.

## 3. Endpoints públicos oficiales activos
Quedan asentados como contratos públicos oficiales activos:
- `GET /api/v1/public/products`
- `GET /api/v1/public/categories`
- `GET /api/v1/public/offers`
- `GET /api/v1/public/settings`
- `GET /api/v1/public/business-status`
- `GET /api/v1/public/commercial-config`

## 4. Envelope oficial de respuesta
Se confirma el envelope oficial para la superficie pública:
- **Success**: `ok` + `data` + `meta`
- **Error**: `ok: false` + `error`

Este formato queda establecido como base contractual para el consumo actual del client en endpoints públicos.

## 5. Separación entre endpoints públicos y protegidos
Se mantiene separación explícita de responsabilidades:
- **Públicos**: contratos versionados para experiencia pública del client.
- **Protegidos**: contratos del dominio administrativo (admin), fuera del contrato público.

Los endpoints protegidos no forman parte de este cierre ni de la superficie pública acordada.

## 6. Estado actual del client
Se confirma que el **client actual ya consume backend real** como fuente productiva de catálogo y configuración pública. El consumo operativo vigente se apoya en los endpoints públicos oficiales activos listados en este documento.

## 7. Retiro de JSON locales como fuente productiva
Se deja asentado que `products.json`, `offers.json` y `estado.json` **ya no son fuente productiva** para el client.

Cualquier remanente local no altera la definición contractual vigente ni reemplaza al backend como fuente de verdad productiva.

## 8. Contrato oficial de settings públicos
Queda confirmado que `GET /api/v1/public/settings` es el **único contrato público oficial** para settings.

Las rutas legacy públicas de settings quedan fuera de circulación como contrato público activo.

## 9. Resultado alcanzado
Resultado de Fase 1 (contratos públicos):
- Contratos públicos oficiales activos definidos y estables.
- Envelope oficial de respuesta unificado para la superficie pública.
- Separación público/protegido preservada sin ambigüedad de alcance.
- Client productivo alineado con backend real.

## 10. Habilitación de Fase 2
Con este cierre, queda **habilitada la apertura de Fase 2** para preparar la base técnica de React en `apps/client`, sin reabrir el alcance contractual público ya saneado.

## 11. Veredicto de cierre
**Veredicto:** Fase 1 cerrada para contratos públicos client-backend.

El proyecto cuenta con una base contractual pública clara, activa y suficiente para avanzar a la siguiente fase.
