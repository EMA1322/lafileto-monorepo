## Qué cambia
- ...

## Cómo probar
- `pnpm dev` → 5173/5174/3000
- `GET /api/v1/health` → 200

## Checklist
- [ ] Docs actualizadas si cambian contratos (APIs, env, despliegue)
- [ ] Sin secrets en el diff (.env)
- [ ] Build local OK (`pnpm -F client build`, `pnpm -F admin build`)
