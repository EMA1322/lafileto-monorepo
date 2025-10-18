-- Drop audit/login related columns
ALTER TABLE `User`
  DROP COLUMN `failedLoginAttempts`,
  DROP COLUMN `lockUntil`,
  DROP COLUMN `createdAt`,
  DROP COLUMN `updatedAt`,
  DROP COLUMN `deletedAt`;

ALTER TABLE `Role`
  DROP COLUMN `createdAt`,
  DROP COLUMN `updatedAt`;

ALTER TABLE `Module`
  DROP COLUMN `createdAt`,
  DROP COLUMN `updatedAt`;

ALTER TABLE `RolePermission`
  DROP COLUMN `updatedAt`;

ALTER TABLE `Setting`
  DROP COLUMN `updatedAt`;
