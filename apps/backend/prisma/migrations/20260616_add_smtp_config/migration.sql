-- AlterTable: add SMTP configuration fields
ALTER TABLE `app_configuration` ADD COLUMN `smtpHost` VARCHAR(255) NULL;
ALTER TABLE `app_configuration` ADD COLUMN `smtpPort` SMALLINT NULL;
ALTER TABLE `app_configuration` ADD COLUMN `smtpSecure` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `app_configuration` ADD COLUMN `smtpUser` VARCHAR(255) NULL;
ALTER TABLE `app_configuration` ADD COLUMN `smtpPass` VARCHAR(255) NULL;
ALTER TABLE `app_configuration` ADD COLUMN `smtpFromName` VARCHAR(255) NULL;
ALTER TABLE `app_configuration` ADD COLUMN `smtpFromEmail` VARCHAR(255) NULL;
