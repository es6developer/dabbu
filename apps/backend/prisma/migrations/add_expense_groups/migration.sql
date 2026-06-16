-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `expenseGroupId` VARCHAR(36) NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS `expense_groups` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `icon` VARCHAR(50) NOT NULL DEFAULT 'users',
    `monthlyIncome` DECIMAL(15, 2) NULL,
    `createdBy` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expense_groups_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `expense_group_members` (
    `id` VARCHAR(36) NOT NULL,
    `groupId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'member',
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `expense_group_members_userId_idx`(`userId`),
    UNIQUE INDEX `expense_group_members_groupId_userId_key`(`groupId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_expenseGroupId_fkey` FOREIGN KEY (`expenseGroupId`) REFERENCES `expense_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_groups` ADD CONSTRAINT `expense_groups_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_group_members` ADD CONSTRAINT `expense_group_members_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `expense_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_group_members` ADD CONSTRAINT `expense_group_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

