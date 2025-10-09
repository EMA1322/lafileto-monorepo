// Integration: RBAC (requiere token admin con permisos "users.*")
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";

const API = request(app);
const email = process.env.ADMIN_EMAIL || "admin@lafileto.ar";
const password = process.env.ADMIN_PASSWORD || "ChangeMe!2025";

let token = "";
const roleId = `role-test-${Date.now()}`;

test("login admin (precondition)", async () => {
  const res = await API.post("/auth/login")
    .set("Content-Type", "application/json")
    .send({ email, password });

  assert.equal(res.status, 200);
  token = res.body.data.token;
  assert.ok(token);
});

test("GET /rbac/roles → 200 (lista)", async () => {
  const res = await API.get("/rbac/roles").set(
    "Authorization",
    `Bearer ${token}`
  );
  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(Array.isArray(res.body?.data));
});

test("POST /rbac/roles → 201 (crear rol nuevo)", async () => {
  const res = await API.post("/rbac/roles")
    .set("Authorization", `Bearer ${token}`)
    .set("Content-Type", "application/json")
    .send({ roleId, name: "Role Temporal Test" });

  assert.equal(res.status, 201);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.roleId, roleId);
});

test("PUT /rbac/roles/:roleId/permissions → 200 y auditoría", async () => {
  const matrix = { dashboard: { r: true, w: false, u: false, d: false } };

  const res = await API.put(`/rbac/roles/${roleId}/permissions`)
    .set("Authorization", `Bearer ${token}`)
    .set("Content-Type", "application/json")
    .send(matrix);

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.updated, 1);

  // Verificar que guardó y auditó
  const rows = await prisma.rolePermission.findMany({ where: { roleId } });
  assert.ok(rows.find((r) => r.moduleKey === "dashboard" && r.r === true));

  const audit = await prisma.auditLog.findFirst({
    where: {
      entity: "role_permissions",
      entityId: roleId,
      action: "permission_change",
    },
    orderBy: { id: "desc" },
  });
  assert.ok(audit, "Debe existir registro de auditoría");
});

// Limpieza (borra el rol y sus permisos)
test("cleanup test role", async () => {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.delete({ where: { roleId } }).catch(() => {});
});
