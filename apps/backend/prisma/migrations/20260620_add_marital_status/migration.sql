-- Add maritalStatus field to User model
ALTER TABLE `users` ADD COLUMN `marital_status` VARCHAR(30) DEFAULT NULL;
