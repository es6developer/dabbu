-- AlterTable: add missing columns to expense_groups
ALTER TABLE `expense_groups` ADD COLUMN `description` VARCHAR(500) NULL;
ALTER TABLE `expense_groups` ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'INR';
ALTER TABLE `expense_groups` ADD COLUMN `monthlyBudget` DECIMAL(15, 2) NULL;

-- CreateTable: group_invitations
CREATE TABLE IF NOT EXISTS `group_invitations` (
    `id` VARCHAR(36) NOT NULL,
    `groupId` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `invitedBy` VARCHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    INDEX `group_invitations_groupId_idx`(`groupId`),
    INDEX `group_invitations_email_idx`(`email`),
    INDEX `group_invitations_email_status_idx`(`email`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `group_invitations` ADD CONSTRAINT `group_invitations_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `shared_finance_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
