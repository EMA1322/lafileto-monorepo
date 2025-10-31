# Backend – I1-SETUP (La Fileto)

## 1) Requisitos
- Node.js 18+ (LTS recomendado)
- MySQL 8.x en local (la base `lafileto` puede estar vacía por ahora)
- (Opcional) Postman para probar

## 2) Instalación
```bash
cd backend
npm i
cp .env.example .env
# Edita .env con tus valores locales (puerto, allowlist CORS, etc.)
# Ejemplo CORS: CORS_ALLOWLIST=http://localhost:5174,http://localhost:5173,http://192.168.1.34:5174,http://192.168.1.34:5173
```

## Habilitar acceso por LAN (CORS)
1. Editá tu archivo `.env` dentro de `apps/backend/` y definí `CORS_ALLOWLIST` con todos los orígenes que necesites (sin espacios, separados por comas).
2. Reiniciá `pnpm dev` para que el backend reconstruya el middleware de CORS. En desarrollo verás el log `"[cors] allowlist: ..."` en la consola con los orígenes activos.
3. (Opcional) Consultá `http://localhost:3000/_debug/cors` mientras el backend está corriendo para validar la allowlist procesada.

### Verificar preflight con curl
```bash
curl -i -X OPTIONS http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://192.168.1.34:5174" \
  -H "Access-Control-Request-Method: POST"
```

Deberías ver un `204 No Content` y el header `Access-Control-Allow-Origin` con el origen consultado.

> Nota: el runner de tests ya inyecta las variables mínimas cuando `NODE_ENV=test`, por lo que no necesitás un `.env` para ejecutar `pnpm --filter backend test` en local. Las pruebas de CORS requieren `supertest` como dependencia de desarrollo y se ejecutan con `NODE_ENV=test` y un `JWT_SECRET` por defecto para CI.
