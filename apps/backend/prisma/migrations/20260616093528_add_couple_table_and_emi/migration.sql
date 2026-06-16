-- AlterTable
ALTER TABLE `user_loans` ADD COLUMN `interestRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `tenureMonths` INTEGER NULL,
    ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT 'personal';

-- CreateTable
CREATE TABLE `couples` (
    `id` VARCHAR(36) NOT NULL,
    `partner1Id` VARCHAR(36) NOT NULL,
    `partner2Id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `linkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `couples_partner1Id_idx`(`partner1Id`),
    INDEX `couples_partner2Id_idx`(`partner2Id`),
    UNIQUE INDEX `couples_partner1Id_partner2Id_key`(`partner1Id`, `partner2Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emi_payments` (
    `id` VARCHAR(36) NOT NULL,
    `loanId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paidDate` DATE NOT NULL,
    `principal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `interest` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `emi_payments_loanId_idx`(`loanId`),
    INDEX `emi_payments_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `couples` ADD CONSTRAINT `couples_partner1Id_fkey` FOREIGN KEY (`partner1Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `couples` ADD CONSTRAINT `couples_partner2Id_fkey` FOREIGN KEY (`partner2Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emi_payments` ADD CONSTRAINT `emi_payments_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `user_loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

