-- Add imageUrl column to Product and cascade category relationship
ALTER TABLE `Product`
  ADD COLUMN `imageUrl` VARCHAR(2048) NULL;

-- Update foreign key constraint to cascade on delete
ALTER TABLE `Product` DROP FOREIGN KEY `Product_categoryId_fkey`;
ALTER TABLE `Product`
  ADD CONSTRAINT `Product_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
