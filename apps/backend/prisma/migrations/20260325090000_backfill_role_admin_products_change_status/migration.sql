-- Backfill: ensure role-admin can change products status in existing environments.
UPDATE `RolePermission`
SET `changeStatus` = true
WHERE `roleId` = 'role-admin'
  AND `moduleKey` = 'products';

-- Si falta la fila, crearla con acceso completo para mantener consistencia de role-admin.
INSERT INTO `RolePermission` (`roleId`, `moduleKey`, `r`, `w`, `u`, `d`, `changeStatus`)
SELECT 'role-admin', 'products', true, true, true, true, true
WHERE EXISTS (SELECT 1 FROM `Role` WHERE `roleId` = 'role-admin')
  AND EXISTS (SELECT 1 FROM `Module` WHERE `moduleKey` = 'products')
  AND NOT EXISTS (
    SELECT 1
    FROM `RolePermission`
    WHERE `roleId` = 'role-admin'
      AND `moduleKey` = 'products'
  );
