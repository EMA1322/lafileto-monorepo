// Controlador RBAC
import { rbacService } from '../services/rbacService.js';
import { ok } from '../utils/envelope.js';

export const rbacController = {
  // Roles
  listRoles: async (_req, res, next) => {
    try {
      const roles = await rbacService.listRoles();
      return res.json(ok({ items: roles }));
    } catch (err) { next(err); }
  },

  createRole: async (req, res, next) => {
    try {
      const body = req.validated?.body ?? req.body ?? {};
      const role = await rbacService.createRole(body);
      return res.status(201).json(ok(role));
    } catch (err) { next(err); }
  },

  updateRole: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = req.validated?.body ?? req.body ?? {};
      const role = await rbacService.updateRole(params.roleId ?? req.params.roleId, body);
      return res.json(ok(role));
    } catch (err) { next(err); }
  },

  deleteRole: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const out = await rbacService.deleteRole(params.roleId ?? req.params.roleId);
      return res.json(ok(out));
    } catch (err) { next(err); }
  },

  // Modules
  listModules: async (_req, res, next) => {
    try {
      const modules = await rbacService.listModules();
      return res.json(ok({ items: modules }));
    } catch (err) { next(err); }
  },

  // Permissions
  getPermissions: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const matrix = await rbacService.getPermissions(params.roleId ?? req.params.roleId);
      return res.json(ok(matrix));
    } catch (err) { next(err); }
  },

  savePermissions: async (req, res, next) => {
    try {
      const params = req.validated?.params ?? req.params ?? {};
      const body = req.validated?.body ?? req.body ?? {};
      const out = await rbacService.savePermissions(
        params.roleId ?? req.params.roleId,
        body.permissions,
        req.user?.id || null
      );
      return res.json(ok(out));
    } catch (err) { next(err); }
  }
};
