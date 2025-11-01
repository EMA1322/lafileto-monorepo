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
# Ejecutá el backend con tus variables.
```

### CORS en desarrollo
- Configurá `CORS_ALLOWLIST` con los orígenes que necesites (se aceptan espacios entre comas y se normalizan al cargar la app).
- Si querés probar desde otro dispositivo, agregá la IP LAN de tu máquina, por ejemplo `http://192.168.1.33:5173`.
- Para verificar rápidamente el preflight:
  ```bash
  curl -i -X OPTIONS http://localhost:3000/ping \
    -H "Origin: http://192.168.1.33:5173" \
    -H "Access-Control-Request-Method: GET"
  ```

### Refrescar lockfile
- Después de rebasear o mergear cambios que toquen dependencias, ejecutá `pnpm -w install --lockfile-only` en la raíz para recalcular `pnpm-lock.yaml`.
