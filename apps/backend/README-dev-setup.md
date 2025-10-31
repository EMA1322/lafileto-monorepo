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
# Ejemplo CORS: CORS_ALLOWLIST=http://192.168.1.34:5174,http://localhost:5174
