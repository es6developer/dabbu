-- AlterTable: add paid_amount to bills table for partial payments
ALTER TABLE `bills` ADD COLUMN `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable: add emi_day and start_date to user_loans table
ALTER TABLE `user_loans` ADD COLUMN `emi_day` INT DEFAULT NULL;
ALTER TABLE `user_loans` ADD COLUMN `start_date` DATE DEFAULT NULL;

-- CreateTable: net_worth_snapshots for monthly net worth history
CREATE TABLE `net_worth_snapshots` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `snapshot_date` DATE NOT NULL,
    `total_assets` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `total_liabilities` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `net_worth` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `bank` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `cash` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `gold` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `property` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `investments` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `fixed_deposits` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `home_loan` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `personal_loan` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `credit_card_debt` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `other_liabilities` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `net_worth_snapshots_user_id_snapshot_date_key`(`user_id`, `snapshot_date`),
    INDEX `net_worth_snapshots_user_id_snapshot_date_idx`(`user_id`, `snapshot_date`),
    CONSTRAINT `net_worth_snapshots_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
