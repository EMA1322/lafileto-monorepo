-- Auditoría eliminada: se quita la clave foránea previa
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_actorUserId_fkey`;
-- Auditoría eliminada: se elimina la tabla completa
DROP TABLE `AuditLog`;
