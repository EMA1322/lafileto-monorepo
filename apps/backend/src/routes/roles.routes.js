import { Router } from 'express';
import { rbacController } from '../controllers/rbacController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { requireAdminRole } from '../middlewares/requireAdminRole.js';
import { validator } from '../middlewares/validator.js';
import {
  roleIdParamSchema,
  rolePermissionsUpdateSchema,
  roleCreateSchema,
  roleUpdateSchema
} from '../validators/schemas.js';

export const rolesRoutes = Router();

rolesRoutes.use(authJWT());
rolesRoutes.use(requireAdminRole());

rolesRoutes.get('/', rbacController.listRoles);
rolesRoutes.post('/', validator(roleCreateSchema), rbacController.createRole);
rolesRoutes.get('/:roleId/permissions', validator(roleIdParamSchema, 'params'), rbacController.getPermissions);
rolesRoutes.put(
  '/:roleId/permissions',
  validator(roleIdParamSchema, 'params'),
  validator(rolePermissionsUpdateSchema),
  rbacController.savePermissions
);
rolesRoutes.put('/:roleId', validator(roleIdParamSchema, 'params'), validator(roleUpdateSchema), rbacController.updateRole);
rolesRoutes.delete('/:roleId', validator(roleIdParamSchema, 'params'), rbacController.deleteRole);
