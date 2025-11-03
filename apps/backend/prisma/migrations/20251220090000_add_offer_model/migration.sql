-- CreateTable Offer
CREATE TABLE `Offer` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `discountPct` TINYINT UNSIGNED NOT NULL,
  `startAt` DATETIME(3) NULL,
  `endAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT `Offer_discountPct_check` CHECK (`discountPct` >= 0 AND `discountPct` <= 100),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Offer_productId_key` ON `Offer`(`productId`);

-- CreateIndex
CREATE INDEX `Offer_startAt_endAt_idx` ON `Offer`(`startAt`, `endAt`);

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
