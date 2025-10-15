import { Router } from 'express';
import { rbacController } from '../controllers/rbacController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { requireAdminRole } from '../middlewares/requireAdminRole.js';
import { validator } from '../middlewares/validator.js';
import { roleIdParamSchema, rolePermissionsUpdateSchema } from '../validators/schemas.js';

export const rolesRoutes = Router();

rolesRoutes.use(authJWT());
rolesRoutes.use(requireAdminRole());

rolesRoutes.get('/', rbacController.listRoles);
rolesRoutes.get('/:roleId/permissions', validator(roleIdParamSchema, 'params'), rbacController.getPermissions);
rolesRoutes.put(
  '/:roleId/permissions',
  validator(roleIdParamSchema, 'params'),
  validator(rolePermissionsUpdateSchema),
  rbacController.savePermissions
);
