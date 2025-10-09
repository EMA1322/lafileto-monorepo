import { Router } from 'express';
import { rbacController } from '../controllers/rbacController.js';
import { authJWT } from '../middlewares/authJWT.js';
import { rbacGuard } from '../middlewares/rbacGuard.js';
import { validator } from '../middlewares/validator.js';
import { roleCreateSchema, roleUpdateSchema, roleIdParamSchema, permissionsMatrixSchemaLoose } from '../validators/schemas.js';

export const rbacRoutes = Router();

// Todas requieren autenticación
rbacRoutes.use(authJWT());

// Roles (módulo "users": R para listar, W para crear, U para actualizar)
rbacRoutes.get('/roles', rbacGuard('users', 'r'), rbacController.listRoles);
rbacRoutes.post('/roles', rbacGuard('users', 'w'), validator(roleCreateSchema), rbacController.createRole);
rbacRoutes.put('/roles/:roleId',
  rbacGuard('users', 'u'),
  validator(roleIdParamSchema, 'params'),
  validator(roleUpdateSchema),
  rbacController.updateRole
);
// Modules (visibles si puede leer "users")
rbacRoutes.get('/modules', rbacGuard('users', 'r'), rbacController.listModules);

// Permissions por rol
rbacRoutes.get('/roles/:roleId/permissions',
  rbacGuard('users', 'r'),
  validator(roleIdParamSchema, 'params'),
  rbacController.getPermissions
);

rbacRoutes.put('/roles/:roleId/permissions',
  rbacGuard('users', 'u'),
  validator(roleIdParamSchema, 'params'),
  validator(permissionsMatrixSchemaLoose),   // ← ESTE
  rbacController.savePermissions
);
