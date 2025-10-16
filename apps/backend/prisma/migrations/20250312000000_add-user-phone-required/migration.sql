-- Añade columna phone obligatoria a User con default técnico
ALTER TABLE `User`
  ADD COLUMN `phone` VARCHAR(32) NOT NULL DEFAULT '0000000000';
