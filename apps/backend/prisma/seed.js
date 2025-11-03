// prisma/seed.js
// Comentarios en español; código en inglés.
// I1: Roles, Modules, RolePermissions, Admin User, Settings.
// I2: Categories (solo si existe la tabla/modelo).

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==============================
// Helpers (idempotentes)
// ==============================
async function upsertRole(roleId, name) {
  await prisma.role.upsert({
    where: { roleId },
    update: { name },
    create: { roleId, name }
  });
}

async function upsertModule(moduleKey, name) {
  await prisma.module.upsert({
    where: { moduleKey },
    update: { name },
    create: { moduleKey, name }
  });
}

async function upsertPermission(roleId, moduleKey, flags) {
  // En tu schema, RolePermission tiene PK compuesta (roleId, moduleKey)
  await prisma.rolePermission.upsert({
    where: { roleId_moduleKey: { roleId, moduleKey } },
    update: {
      r: !!flags.r,
      w: !!flags.w,
      u: !!flags.u,
      d: !!flags.d,
      changeStatus: !!flags.changeStatus
    },
    create: {
      roleId,
      moduleKey,
      r: !!flags.r,
      w: !!flags.w,
      u: !!flags.u,
      d: !!flags.d,
      changeStatus: !!flags.changeStatus
    }
  });
}

const RBAC_MODULES = [
  { key: 'admin-header', name: 'Header Admin' },
  {
    key: 'dashboard',
    name: 'Dashboard',
    supervisorFlags: { r: true, w: false, u: false, d: false },
    viewerFlags: { r: true, w: false, u: false, d: false }
  },
  {
    key: 'products',
    name: 'Productos',
    supervisorFlags: { r: true, w: true, u: true, d: false, changeStatus: true },
    viewerFlags: { r: true, w: false, u: false, d: false, changeStatus: false }
  },
  {
    key: 'offers',
    name: 'Ofertas',
    supervisorFlags: { r: true, w: false, u: false, d: false },
    viewerFlags: { r: true, w: false, u: false, d: false }
  },
  {
    key: 'categories',
    name: 'Categorías',
    supervisorFlags: { r: true, w: true, u: true, d: false },
    viewerFlags: { r: true, w: false, u: false, d: false }
  },
  { key: 'settings', name: 'Configuración' },
  { key: 'users', name: 'Usuarios / Roles & Permisos' }
];

const ADMIN_FULL_ACCESS = { r: true, w: true, u: true, d: true, changeStatus: true };
const NO_ACCESS = { r: false, w: false, u: false, d: false, changeStatus: false };
const VIEWER_NO_ACCESS = { r: false, w: false, u: false, d: false, changeStatus: false };

async function upsertSetting(key, value) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

async function upsertAdminUser({ email, fullName, password, roleId, phone }) {
  const passwordHash = bcrypt.hashSync(password, 10);
  const normalizedPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : '1100000000';
  await prisma.user.upsert({
    where: { email },
    update: { fullName, passwordHash, roleId, status: 'ACTIVE', phone: normalizedPhone },
    create: { fullName, email, passwordHash, roleId, status: 'ACTIVE', phone: normalizedPhone }
  });
}

// (I2) Detectar si existe la tabla/modelo Category para no fallar si I2 no está migrado aún
async function categoryTableExists() {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS c
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Category'
  `;
  const c = Array.isArray(rows) ? Number(rows[0].c) : 0;
  return c > 0;
}

// ==============================
// Seed I1
// ==============================
async function seedI1() {
  console.log('▶ Seeding roles…');
  await upsertRole('role-admin', 'Administrador');
  await upsertRole('role-supervisor', 'Supervisor');
  await upsertRole('role-viewer', 'Viewer');

  console.log('▶ Seeding modules…');
  for (const mod of RBAC_MODULES) {
    await upsertModule(mod.key, mod.name);
  }

  console.log('▶ Seeding permissions (Admin)…');
  for (const mod of RBAC_MODULES) {
    await upsertPermission('role-admin', mod.key, ADMIN_FULL_ACCESS);
  }

  console.log('▶ Seeding permissions (Supervisor)…');
  for (const mod of RBAC_MODULES) {
    const flags = mod.supervisorFlags || NO_ACCESS;
    await upsertPermission('role-supervisor', mod.key, flags);
  }

  console.log('▶ Seeding permissions (Viewer)…');
  for (const mod of RBAC_MODULES) {
    const flags = mod.viewerFlags || VIEWER_NO_ACCESS;
    await upsertPermission('role-viewer', mod.key, flags);
  }

  console.log('▶ Seeding admin user…');
  await upsertAdminUser({
    email:   process.env.ADMIN_EMAIL    || 'admin@lafileto.ar',
    fullName:process.env.ADMIN_FULLNAME || 'La Fileto Admin',
    password:process.env.ADMIN_PASSWORD || 'ChangeMe!2025',
    roleId: 'role-admin',
    phone:  process.env.ADMIN_PHONE     || '+54 11 2345-6789'
  });

  console.log('▶ Seeding settings…');
  await upsertSetting('isOpen', false);
  await upsertSetting('whatsAppNumber', null);

  console.log('✓ I1 listo');
}

// ==============================
// Seed I2 (opcional, si existe Category)
// ==============================
async function seedI2() {
  if (!(await categoryTableExists())) {
    console.log('↪ Category no existe aún — omitiendo I2 (ok).');
    return;
  }
  try {
    await prisma.category.createMany({
      data: [
        {
          name: 'Carnes',
          imageUrl: 'https://cdn.example.com/categories/carnes.webp',
          active: true
        },
        {
          name: 'Pastas',
          imageUrl: 'https://cdn.example.com/categories/pastas.webp',
          active: true
        },
        {
          name: 'Pizzas',
          imageUrl: 'https://cdn.example.com/categories/pizzas.webp',
          active: true
        },
        {
          name: 'Bebidas',
          imageUrl: 'https://cdn.example.com/categories/bebidas.webp',
          active: true
        },
        {
          name: 'Ensaladas',
          imageUrl: 'https://cdn.example.com/categories/ensaladas.webp',
          active: true
        }
      ],
      skipDuplicates: true
    });
    console.log('✓ I2: categorías demo listas');
  } catch (e) {
    console.log('↪ I2 omitido (Category no está mapeado en Prisma todavía).');
  }
}

// ==============================
// Orquestador
// ==============================
async function runSeed() {
  console.log('→ Seed iniciado');
  await seedI1();
  await seedI2();
  console.log('→ Seed finalizado');
}

try {
  await runSeed();
} catch (e) {
  console.error('❌ Seed failed', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
