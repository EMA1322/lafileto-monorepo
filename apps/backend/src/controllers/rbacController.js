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
      const matrix = await rbacService.getPermissions(req.params.roleId);
      return res.json(ok(matrix));
    } catch (err) { next(err); }
  },

  savePermissions: async (req, res, next) => {
    try {
      const out = await rbacService.savePermissions(
        req.params.roleId,
        req.body.permissions,
        req.user?.id || null
      );
      return res.json(ok(out));
    } catch (err) { next(err); }
  }
};
