-- Drop unique constraints related to legacy product fields
ALTER TABLE `Product` DROP INDEX `Product_slug_key`;
ALTER TABLE `Product` DROP INDEX `Product_sku_key`;

-- Remove legacy product columns
ALTER TABLE `Product`
  DROP COLUMN `slug`,
  DROP COLUMN `sku`,
  DROP COLUMN `currency`,
  DROP COLUMN `isFeatured`;
