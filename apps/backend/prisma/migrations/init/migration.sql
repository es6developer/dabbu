-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `phone` VARCHAR(20) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'UTC',
    `locale` VARCHAR(10) NOT NULL DEFAULT 'en',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `isPhoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `role` VARCHAR(20) NOT NULL DEFAULT 'user',
    `otpCode` VARCHAR(6) NULL,
    `otpExpiresAt` DATETIME(3) NULL,
    `otpPurpose` VARCHAR(20) NULL,
    `otpAttempts` INTEGER NOT NULL DEFAULT 0,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSecret` VARCHAR(255) NULL,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockoutUntil` DATETIME(3) NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `lastFailedLoginAt` DATETIME(3) NULL,
    `passwordChangedAt` DATETIME(3) NULL,
    `appPin` VARCHAR(255) NULL,
    `biometricEnabled` BOOLEAN NOT NULL DEFAULT false,
    `stripeCustomerId` VARCHAR(255) NULL,
    `razorpayCustomerId` VARCHAR(255) NULL,
    `passwordHistory` JSON NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_isActive_idx`(`isActive`),
    INDEX `users_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `refreshToken` VARCHAR(500) NOT NULL,
    `userAgent` VARCHAR(500) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_refreshToken_idx`(`refreshToken`),
    INDEX `sessions_userId_isRevoked_idx`(`userId`, `isRevoked`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devices` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `deviceId` VARCHAR(255) NOT NULL,
    `platform` VARCHAR(50) NULL,
    `pushToken` VARCHAR(500) NULL,
    `deviceName` VARCHAR(255) NULL,
    `appVersion` VARCHAR(20) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `devices_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `devices_pushToken_idx`(`pushToken`),
    UNIQUE INDEX `devices_userId_deviceId_key`(`userId`, `deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminders` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'general',
    `remindAt` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `startDate` DATETIME(3) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `priority` VARCHAR(10) NOT NULL DEFAULT 'medium',
    `isSent` BOOLEAN NOT NULL DEFAULT false,
    `sentAt` DATETIME(3) NULL,
    `isSnoozed` BOOLEAN NOT NULL DEFAULT false,
    `snoozedUntil` DATETIME(3) NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `categoryId` VARCHAR(36) NULL,
    `deletedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reminders_userId_remindAt_idx`(`userId`, `remindAt`),
    INDEX `reminders_userId_isSent_idx`(`userId`, `isSent`),
    INDEX `reminders_remindAt_isSent_idx`(`remindAt`, `isSent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_reminders` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `reminderId` VARCHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'general',
    `frequency` VARCHAR(20) NOT NULL,
    `interval` INTEGER NOT NULL DEFAULT 1,
    `dayOfMonth` INTEGER NULL,
    `dayOfWeek` INTEGER NULL,
    `monthOfYear` INTEGER NULL,
    `time` VARCHAR(5) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastTriggeredAt` DATETIME(3) NULL,
    `nextTriggerAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recurring_reminders_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `recurring_reminders_nextTriggerAt_isActive_idx`(`nextTriggerAt`, `isActive`),
    UNIQUE INDEX `recurring_reminders_reminderId_key`(`reminderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `interval` VARCHAR(20) NOT NULL,
    `features` JSON NOT NULL,
    `maxAccounts` INTEGER NOT NULL DEFAULT 3,
    `maxCategories` INTEGER NOT NULL DEFAULT 20,
    `maxBudgets` INTEGER NOT NULL DEFAULT 10,
    `maxBills` INTEGER NOT NULL DEFAULT 20,
    `maxGoals` INTEGER NOT NULL DEFAULT 10,
    `maxInvestments` INTEGER NOT NULL DEFAULT 5,
    `maxFamilyMembers` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscription_plans_code_key`(`code`),
    INDEX `subscription_plans_code_idx`(`code`),
    INDEX `subscription_plans_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `planId` VARCHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `trialEndsAt` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `stripeSubscriptionId` VARCHAR(255) NULL,
    `stripePriceId` VARCHAR(255) NULL,
    `razorpaySubscriptionId` VARCHAR(255) NULL,
    `razorpayPlanId` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `subscriptions_planId_idx`(`planId`),
    INDEX `subscriptions_status_currentPeriodEnd_idx`(`status`, `currentPeriodEnd`),
    INDEX `subscriptions_stripeSubscriptionId_idx`(`stripeSubscriptionId`),
    INDEX `subscriptions_razorpaySubscriptionId_idx`(`razorpaySubscriptionId`),
    UNIQUE INDEX `subscriptions_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `subscriptionId` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `status` VARCHAR(20) NOT NULL,
    `paymentMethod` VARCHAR(50) NULL,
    `gateway` VARCHAR(20) NULL,
    `stripePaymentIntentId` VARCHAR(255) NULL,
    `stripePaymentMethodId` VARCHAR(255) NULL,
    `stripeChargeId` VARCHAR(255) NULL,
    `razorpayPaymentId` VARCHAR(255) NULL,
    `razorpayOrderId` VARCHAR(255) NULL,
    `razorpaySignature` VARCHAR(255) NULL,
    `receiptUrl` VARCHAR(500) NULL,
    `failureMessage` TEXT NULL,
    `failureCode` VARCHAR(100) NULL,
    `paidAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `refundAmount` DECIMAL(10, 2) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payments_userId_status_idx`(`userId`, `status`),
    INDEX `payments_subscriptionId_idx`(`subscriptionId`),
    INDEX `payments_stripePaymentIntentId_idx`(`stripePaymentIntentId`),
    INDEX `payments_razorpayPaymentId_idx`(`razorpayPaymentId`),
    INDEX `payments_razorpayOrderId_idx`(`razorpayOrderId`),
    INDEX `payments_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `subscriptionId` VARCHAR(36) NOT NULL,
    `invoiceNumber` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `status` VARCHAR(20) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `pdfUrl` VARCHAR(500) NULL,
    `lineItems` JSON NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    INDEX `invoices_userId_status_idx`(`userId`, `status`),
    INDEX `invoices_subscriptionId_idx`(`subscriptionId`),
    INDEX `invoices_invoiceNumber_idx`(`invoiceNumber`),
    INDEX `invoices_dueDate_status_idx`(`dueDate`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `families` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(20) NULL,
    `ownerId` VARCHAR(36) NOT NULL,
    `maxMembers` INTEGER NOT NULL DEFAULT 5,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `families_code_key`(`code`),
    INDEX `families_code_idx`(`code`),
    INDEX `families_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family_members` (
    `id` VARCHAR(36) NOT NULL,
    `familyId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'member',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `family_members_familyId_role_idx`(`familyId`, `role`),
    INDEX `family_members_userId_idx`(`userId`),
    UNIQUE INDEX `family_members_familyId_userId_key`(`familyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chats` (
    `id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'direct',
    `createdBy` VARCHAR(36) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chats_createdBy_idx`(`createdBy`),
    INDEX `chats_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participants` (
    `id` VARCHAR(36) NOT NULL,
    `chatId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leftAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_participants_userId_isActive_idx`(`userId`, `isActive`),
    UNIQUE INDEX `chat_participants_chatId_userId_key`(`chatId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` VARCHAR(36) NOT NULL,
    `chatId` VARCHAR(36) NOT NULL,
    `senderId` VARCHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `messageType` VARCHAR(20) NOT NULL DEFAULT 'text',
    `mediaUrl` VARCHAR(500) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `isEdited` BOOLEAN NOT NULL DEFAULT false,
    `editedAt` DATETIME(3) NULL,
    `replyToId` VARCHAR(36) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chat_messages_chatId_createdAt_idx`(`chatId`, `createdAt`),
    INDEX `chat_messages_senderId_idx`(`senderId`),
    INDEX `chat_messages_chatId_isRead_idx`(`chatId`, `isRead`),
    INDEX `chat_messages_messageType_idx`(`messageType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shared_tasks` (
    `id` VARCHAR(36) NOT NULL,
    `familyId` VARCHAR(36) NOT NULL,
    `createdById` VARCHAR(36) NOT NULL,
    `assignedToId` VARCHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `priority` VARCHAR(10) NOT NULL DEFAULT 'medium',
    `dueDate` DATE NULL,
    `completedAt` DATETIME(3) NULL,
    `completedById` VARCHAR(36) NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `frequency` VARCHAR(20) NULL,
    `metadata` JSON NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `shared_tasks_familyId_status_idx`(`familyId`, `status`),
    INDEX `shared_tasks_assignedToId_status_idx`(`assignedToId`, `status`),
    INDEX `shared_tasks_dueDate_status_idx`(`dueDate`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shared_reminders` (
    `id` VARCHAR(36) NOT NULL,
    `familyId` VARCHAR(36) NOT NULL,
    `createdById` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `remindAt` DATETIME(3) NOT NULL,
    `isSent` BOOLEAN NOT NULL DEFAULT false,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `frequency` VARCHAR(20) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `shared_reminders_familyId_remindAt_idx`(`familyId`, `remindAt`),
    INDEX `shared_reminders_familyId_isSent_idx`(`familyId`, `isSent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `initialBalance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `creditLimit` DECIMAL(15, 2) NULL,
    `color` VARCHAR(50) NULL,
    `icon` VARCHAR(50) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `lastSyncedAt` DATETIME(3) NULL,
    `description` VARCHAR(500) NULL,
    `institution` VARCHAR(255) NULL,
    `lastFourDigits` VARCHAR(4) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `accounts_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `accounts_userId_type_idx`(`userId`, `type`),
    INDEX `accounts_userId_isArchived_idx`(`userId`, `isArchived`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_categories` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `transactionType` VARCHAR(10) NOT NULL,
    `icon` VARCHAR(50) NULL,
    `color` VARCHAR(50) NULL,
    `parentId` VARCHAR(36) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transaction_categories_userId_transactionType_idx`(`userId`, `transactionType`),
    INDEX `transaction_categories_userId_parentId_idx`(`userId`, `parentId`),
    INDEX `transaction_categories_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `transaction_categories_name_userId_idx`(`name`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
    `date` DATE NOT NULL,
    `description` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `tags` JSON NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `recurringId` VARCHAR(36) NULL,
    `recurringFrequency` VARCHAR(20) NULL,
    `recurringEndDate` DATE NULL,
    `receiptUrl` VARCHAR(500) NULL,
    `exchangeRate` DECIMAL(10, 6) NULL,
    `originalCurrency` VARCHAR(10) NULL,
    `originalAmount` DECIMAL(15, 2) NULL,
    `transferToAccountId` VARCHAR(36) NULL,
    `isReviewed` BOOLEAN NOT NULL DEFAULT false,
    `isSplit` BOOLEAN NOT NULL DEFAULT false,
    `parentTransactionId` VARCHAR(36) NULL,
    `metadata` JSON NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transactions_userId_date_idx`(`userId`, `date`),
    INDEX `transactions_accountId_date_idx`(`accountId`, `date`),
    INDEX `transactions_categoryId_date_idx`(`categoryId`, `date`),
    INDEX `transactions_userId_type_date_idx`(`userId`, `type`, `date`),
    INDEX `transactions_userId_status_idx`(`userId`, `status`),
    INDEX `transactions_userId_isReviewed_idx`(`userId`, `isReviewed`),
    INDEX `transactions_date_status_idx`(`date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `spent` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `period` VARCHAR(15) NOT NULL DEFAULT 'monthly',
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notifyAt` INTEGER NOT NULL DEFAULT 80,
    `notes` VARCHAR(500) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budgets_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `budgets_userId_period_idx`(`userId`, `period`),
    INDEX `budgets_userId_startDate_endDate_idx`(`userId`, `startDate`, `endDate`),
    INDEX `budgets_categoryId_startDate_endDate_idx`(`categoryId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bills` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NULL,
    `categoryId` VARCHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `dueDate` DATE NOT NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `paidDate` DATE NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `frequency` VARCHAR(20) NULL,
    `reminderDays` INTEGER NOT NULL DEFAULT 5,
    `notes` VARCHAR(500) NULL,
    `payee` VARCHAR(255) NULL,
    `autopayUrl` VARCHAR(500) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bills_userId_dueDate_idx`(`userId`, `dueDate`),
    INDEX `bills_userId_isPaid_idx`(`userId`, `isPaid`),
    INDEX `bills_dueDate_isPaid_idx`(`dueDate`, `isPaid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goals` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `targetAmount` DECIMAL(15, 2) NOT NULL,
    `currentAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `deadline` DATE NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'savings',
    `icon` VARCHAR(50) NULL,
    `color` VARCHAR(50) NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATE NULL,
    `sortOrder` INTEGER NULL DEFAULT 0,
    `notes` VARCHAR(500) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `goals_userId_isCompleted_idx`(`userId`, `isCompleted`),
    INDEX `goals_userId_deadline_idx`(`userId`, `deadline`),
    INDEX `goals_userId_type_idx`(`userId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investments` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `symbol` VARCHAR(20) NULL,
    `quantity` DECIMAL(15, 6) NOT NULL,
    `buyPrice` DECIMAL(15, 2) NOT NULL,
    `currentPrice` DECIMAL(15, 2) NULL,
    `purchaseDate` DATE NULL,
    `fees` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `notes` VARCHAR(500) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `investments_userId_type_idx`(`userId`, `type`),
    INDEX `investments_userId_symbol_idx`(`userId`, `symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `period` VARCHAR(15) NOT NULL,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `totalIncome` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalExpense` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `netAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAccountsBalance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `topCategory` VARCHAR(100) NULL,
    `transactionCount` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `analytics_userId_period_periodStart_idx`(`userId`, `period`, `periodStart`),
    INDEX `analytics_userId_periodStart_periodEnd_idx`(`userId`, `periodStart`, `periodEnd`),
    UNIQUE INDEX `analytics_userId_period_periodStart_key`(`userId`, `period`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `actionUrl` VARCHAR(500) NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_isRead_idx`(`userId`, `isRead`),
    INDEX `notifications_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `notifications_userId_type_idx`(`userId`, `type`),
    INDEX `notifications_isRead_createdAt_idx`(`isRead`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_logs` (
    `id` VARCHAR(36) NOT NULL,
    `notificationId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `channel` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `errorMessage` TEXT NULL,
    `deliveredAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_logs_notificationId_idx`(`notificationId`),
    INDEX `notification_logs_userId_status_idx`(`userId`, `status`),
    INDEX `notification_logs_channel_createdAt_idx`(`channel`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sms_detections` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `sender` VARCHAR(255) NOT NULL,
    `messageBody` TEXT NOT NULL,
    `detectedAmount` DECIMAL(15, 2) NULL,
    `detectedCurrency` VARCHAR(10) NULL,
    `detectedType` VARCHAR(10) NULL,
    `confidence` FLOAT NULL,
    `categoryId` VARCHAR(36) NULL,
    `isProcessed` BOOLEAN NOT NULL DEFAULT false,
    `processedAt` DATETIME(3) NULL,
    `transactionId` VARCHAR(36) NULL,
    `rawData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sms_detections_userId_isProcessed_idx`(`userId`, `isProcessed`),
    INDEX `sms_detections_sender_idx`(`sender`),
    INDEX `sms_detections_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `theme` VARCHAR(10) NOT NULL DEFAULT 'system',
    `weeklyReport` BOOLEAN NOT NULL DEFAULT true,
    `monthlyReport` BOOLEAN NOT NULL DEFAULT true,
    `largeTransactionAlert` DECIMAL(15, 2) NOT NULL DEFAULT 1000,
    `budgetAlertThreshold` INTEGER NOT NULL DEFAULT 80,
    `pushNotifications` BOOLEAN NOT NULL DEFAULT true,
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `smsNotifications` BOOLEAN NOT NULL DEFAULT false,
    `biometricAuth` BOOLEAN NOT NULL DEFAULT false,
    `autoDetectTransactions` BOOLEAN NOT NULL DEFAULT true,
    `defaultCurrency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `dateFormat` VARCHAR(20) NOT NULL DEFAULT 'MM/dd/yyyy',
    `firstDayOfWeek` INTEGER NOT NULL DEFAULT 0,
    `language` VARCHAR(10) NOT NULL DEFAULT 'en',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_flags` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `rollouts` JSON NULL,
    `createdBy` VARCHAR(36) NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feature_flags_name_key`(`name`),
    INDEX `feature_flags_name_idx`(`name`),
    INDEX `feature_flags_isEnabled_idx`(`isEnabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` VARCHAR(36) NOT NULL,
    `gateway` VARCHAR(20) NOT NULL,
    `eventId` VARCHAR(255) NOT NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `requestBody` JSON NOT NULL,
    `responseStatus` INTEGER NULL DEFAULT 200,
    `errorMessage` TEXT NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `webhook_events_gateway_status_idx`(`gateway`, `status`),
    INDEX `webhook_events_eventType_createdAt_idx`(`eventType`, `createdAt`),
    INDEX `webhook_events_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `webhook_events_gateway_eventId_key`(`gateway`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_methods` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `gateway` VARCHAR(20) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `stripePaymentMethodId` VARCHAR(255) NULL,
    `razorpayInstrumentId` VARCHAR(255) NULL,
    `razorpayTokenId` VARCHAR(255) NULL,
    `lastFourDigits` VARCHAR(4) NULL,
    `cardBrand` VARCHAR(20) NULL,
    `expMonth` INTEGER NULL,
    `expYear` INTEGER NULL,
    `cardHolderName` VARCHAR(255) NULL,
    `upiHandle` VARCHAR(100) NULL,
    `bankName` VARCHAR(100) NULL,
    `isExpired` BOOLEAN NOT NULL DEFAULT false,
    `billingAddress` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_methods_userId_isDefault_idx`(`userId`, `isDefault`),
    INDEX `payment_methods_userId_gateway_idx`(`userId`, `gateway`),
    INDEX `payment_methods_stripePaymentMethodId_idx`(`stripePaymentMethodId`),
    INDEX `payment_methods_razorpayInstrumentId_idx`(`razorpayInstrumentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quota_tracking` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `resource` VARCHAR(50) NOT NULL,
    `used` INTEGER NOT NULL DEFAULT 0,
    `limit` INTEGER NOT NULL DEFAULT 0,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quota_tracking_userId_resource_idx`(`userId`, `resource`),
    INDEX `quota_tracking_resource_periodStart_periodEnd_idx`(`resource`, `periodStart`, `periodEnd`),
    UNIQUE INDEX `quota_tracking_userId_resource_periodStart_key`(`userId`, `resource`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
    `permissions` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    INDEX `admin_users_email_idx`(`email`),
    INDEX `admin_users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NULL,
    `adminId` VARCHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(50) NOT NULL,
    `entityId` VARCHAR(36) NULL,
    `description` TEXT NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `audit_logs_adminId_createdAt_idx`(`adminId`, `createdAt`),
    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `audit_logs_action_createdAt_idx`(`action`, `createdAt`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `transaction_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_reminders` ADD CONSTRAINT `recurring_reminders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_reminders` ADD CONSTRAINT `recurring_reminders_reminderId_fkey` FOREIGN KEY (`reminderId`) REFERENCES `reminders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_replyToId_fkey` FOREIGN KEY (`replyToId`) REFERENCES `chat_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shared_tasks` ADD CONSTRAINT `shared_tasks_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shared_tasks` ADD CONSTRAINT `shared_tasks_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shared_tasks` ADD CONSTRAINT `shared_tasks_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shared_reminders` ADD CONSTRAINT `shared_reminders_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shared_reminders` ADD CONSTRAINT `shared_reminders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_categories` ADD CONSTRAINT `transaction_categories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_categories` ADD CONSTRAINT `transaction_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `transaction_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `transaction_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_parentTransactionId_fkey` FOREIGN KEY (`parentTransactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `transaction_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `transaction_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics` ADD CONSTRAINT `analytics_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sms_detections` ADD CONSTRAINT `sms_detections_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quota_tracking` ADD CONSTRAINT `quota_tracking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

