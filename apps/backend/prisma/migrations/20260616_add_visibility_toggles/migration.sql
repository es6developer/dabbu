-- AlterTable: add bottom bar and quick action visibility toggles to settings
ALTER TABLE `settings` ADD COLUMN `bottomBarVisible` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `settings` ADD COLUMN `quickActionVisible` BOOLEAN NOT NULL DEFAULT true;
