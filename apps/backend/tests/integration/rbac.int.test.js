// Integration: RBAC (requiere token admin con permisos "users.*")
import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unexpected server address");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (!server) return;

  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
});

async function api(path, { method = "GET", headers = {}, json } = {}) {
  if (!baseUrl) {
    throw new Error("Server not initialized");
  }

  const finalHeaders = { ...headers };
  let body;

  if (json !== undefined) {
    body = typeof json === "string" ? json : JSON.stringify(json);
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: finalHeaders,
    body,
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : undefined;
  } catch (error) {
    data = undefined;
  }

  return {
    status: response.status,
    body: data,
    text,
    headers: response.headers,
  };
}

const email = process.env.ADMIN_EMAIL || "admin@lafileto.ar";
const password = process.env.ADMIN_PASSWORD || "ChangeMe!2025";

let token = "";
const roleId = `role-test-${Date.now()}`;

test("login admin (precondition)", async () => {
  const res = await api("/auth/login", {
    method: "POST",
    json: { email, password },
  });

  assert.equal(res.status, 200);
  token = res.body.data.token;
  assert.ok(token);
});

test("GET /rbac/roles → 200 (lista)", async () => {
  const res = await api("/rbac/roles", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(Array.isArray(res.body?.data));
});

test("POST /rbac/roles → 201 (crear rol nuevo)", async () => {
  const res = await api("/rbac/roles", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    json: { roleId, name: "Role Temporal Test" },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.roleId, roleId);
});

test("PUT /rbac/roles/:roleId/permissions → 200 sin auditoría", async () => {
  const matrix = { dashboard: { r: true, w: false, u: false, d: false } };

  const res = await api(`/rbac/roles/${roleId}/permissions`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    json: matrix,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.updated, 1);

  // Auditoría eliminada: solo verificamos persistencia de permisos
  const rows = await prisma.rolePermission.findMany({ where: { roleId } });
  assert.ok(rows.find((r) => r.moduleKey === "dashboard" && r.r === true));
});

// Limpieza (borra el rol y sus permisos)
test("cleanup test role", async () => {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.delete({ where: { roleId } }).catch(() => {});
});
