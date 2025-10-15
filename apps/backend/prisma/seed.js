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
    update: { r: !!flags.r, w: !!flags.w, u: !!flags.u, d: !!flags.d },
    create: { roleId, moduleKey, r: !!flags.r, w: !!flags.w, u: !!flags.u, d: !!flags.d }
  });
}

async function upsertSetting(key, value) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

async function upsertAdminUser({ email, fullName, password, roleId }) {
  const passwordHash = bcrypt.hashSync(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { fullName, passwordHash, roleId, status: 'ACTIVE' },
    create: { fullName, email, passwordHash, roleId, status: 'ACTIVE' }
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

  console.log('▶ Seeding modules…');
  const modules = [
    ['admin-header', 'Header Admin'],
    ['dashboard',    'Dashboard'],
    ['products',     'Productos'],
    ['categories',   'Categorías'],
    ['settings',     'Configuración'],
    ['users',        'Usuarios / Roles & Permisos'],
  ];
  for (const [key, name] of modules) await upsertModule(key, name);

  console.log('▶ Seeding permissions (Admin)…');
  for (const [key] of modules) {
    await upsertPermission('role-admin', key, { r: true, w: true, u: true, d: true });
  }

  console.log('▶ Seeding permissions (Supervisor)…');
  const sup = (mk) => {
    if (mk === 'dashboard')  return { r: true,  w: false, u: false, d: false };
    if (mk === 'products')   return { r: true,  w: true,  u: true,  d: false };
    if (mk === 'categories') return { r: true,  w: true,  u: true,  d: false };
    return { r: false, w: false, u: false, d: false };
  };
  for (const [key] of modules) {
    await upsertPermission('role-supervisor', key, sup(key));
  }

  console.log('▶ Seeding admin user…');
  await upsertAdminUser({
    email:   process.env.ADMIN_EMAIL    || 'admin@lafileto.ar',
    fullName:process.env.ADMIN_FULLNAME || 'La Fileto Admin',
    password:process.env.ADMIN_PASSWORD || 'ChangeMe!2025',
    roleId: 'role-admin'
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
        { name: 'Comidas',  status: 'active'   },
        { name: 'Bebidas',  status: 'active'   },
        { name: 'Postres',  status: 'inactive' }
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
