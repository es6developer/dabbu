-- DropForeignKey
ALTER TABLE `challenge_badges` DROP FOREIGN KEY `challenge_badges_challengeId_fkey`;

-- DropForeignKey
ALTER TABLE `challenge_participants` DROP FOREIGN KEY `challenge_participants_challengeId_fkey`;

-- DropForeignKey
ALTER TABLE `contribution_rules` DROP FOREIGN KEY `contribution_rules_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `conversion_events` DROP FOREIGN KEY `conversion_events_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `couple_finance_profiles` DROP FOREIGN KEY `couple_finance_profiles_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `couple_finance_profiles` DROP FOREIGN KEY `couple_finance_profiles_partner1Id_fkey`;

-- DropForeignKey
ALTER TABLE `couple_finance_profiles` DROP FOREIGN KEY `couple_finance_profiles_partner2Id_fkey`;

-- DropForeignKey
ALTER TABLE `expense_attachments` DROP FOREIGN KEY `expense_attachments_expenseId_fkey`;

-- DropForeignKey
ALTER TABLE `expense_comments` DROP FOREIGN KEY `expense_comments_expenseId_fkey`;

-- DropForeignKey
ALTER TABLE `expense_splits` DROP FOREIGN KEY `expense_splits_expenseId_fkey`;

-- DropForeignKey
ALTER TABLE `expense_splits` DROP FOREIGN KEY `expense_splits_memberId_fkey`;

-- DropForeignKey
ALTER TABLE `grocery_items` DROP FOREIGN KEY `grocery_items_listId_fkey`;

-- DropForeignKey
ALTER TABLE `group_access_restrictions` DROP FOREIGN KEY `group_access_restrictions_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_activity_events` DROP FOREIGN KEY `group_activity_events_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `group_chat_messages` DROP FOREIGN KEY `group_chat_messages_chatId_fkey`;

-- DropForeignKey
ALTER TABLE `group_chat_messages` DROP FOREIGN KEY `group_chat_messages_replyToId_fkey`;

-- DropForeignKey
ALTER TABLE `group_chat_messages` DROP FOREIGN KEY `group_chat_messages_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `group_chats` DROP FOREIGN KEY `group_chats_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_expenses` DROP FOREIGN KEY `group_expenses_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_expenses` DROP FOREIGN KEY `group_expenses_paidByMemberId_fkey`;

-- DropForeignKey
ALTER TABLE `group_expenses` DROP FOREIGN KEY `group_expenses_tripDayId_fkey`;

-- DropForeignKey
ALTER TABLE `group_incomes` DROP FOREIGN KEY `group_incomes_addedByMemberId_fkey`;

-- DropForeignKey
ALTER TABLE `group_incomes` DROP FOREIGN KEY `group_incomes_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_invitations` DROP FOREIGN KEY `group_invitations_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_lifecycle_events` DROP FOREIGN KEY `group_lifecycle_events_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_member_removal_logs` DROP FOREIGN KEY `group_member_removal_logs_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_member_temp` DROP FOREIGN KEY `group_member_temp_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_member_temp` DROP FOREIGN KEY `group_member_temp_inviteLinkId_fkey`;

-- DropForeignKey
ALTER TABLE `group_member_temp` DROP FOREIGN KEY `group_member_temp_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `group_members` DROP FOREIGN KEY `group_members_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `group_members` DROP FOREIGN KEY `group_members_userId_fkey`;

-- DropForeignKey
ALTER TABLE `install_tracking` DROP FOREIGN KEY `install_tracking_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `invite_links` DROP FOREIGN KEY `invite_links_createdByTempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `invite_links` DROP FOREIGN KEY `invite_links_createdByUserId_fkey`;

-- DropForeignKey
ALTER TABLE `invite_links` DROP FOREIGN KEY `invite_links_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `life_event_contributors` DROP FOREIGN KEY `life_event_contributors_eventId_fkey`;

-- DropForeignKey
ALTER TABLE `life_event_expenses` DROP FOREIGN KEY `life_event_expenses_eventId_fkey`;

-- DropForeignKey
ALTER TABLE `onboarding_events` DROP FOREIGN KEY `onboarding_events_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `poll_options` DROP FOREIGN KEY `poll_options_pollId_fkey`;

-- DropForeignKey
ALTER TABLE `poll_votes` DROP FOREIGN KEY `poll_votes_optionId_fkey`;

-- DropForeignKey
ALTER TABLE `poll_votes` DROP FOREIGN KEY `poll_votes_pollId_fkey`;

-- DropForeignKey
ALTER TABLE `premium_trials` DROP FOREIGN KEY `premium_trials_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `premium_trials` DROP FOREIGN KEY `premium_trials_userId_fkey`;

-- DropForeignKey
ALTER TABLE `qr_split_items` DROP FOREIGN KEY `qr_split_items_sessionId_fkey`;

-- DropForeignKey
ALTER TABLE `qr_split_participants` DROP FOREIGN KEY `qr_split_participants_sessionId_fkey`;

-- DropForeignKey
ALTER TABLE `referral_history` DROP FOREIGN KEY `referral_history_referralLinkId_fkey`;

-- DropForeignKey
ALTER TABLE `referral_history` DROP FOREIGN KEY `referral_history_referredTempId_fkey`;

-- DropForeignKey
ALTER TABLE `referral_history` DROP FOREIGN KEY `referral_history_referredUserId_fkey`;

-- DropForeignKey
ALTER TABLE `referral_history` DROP FOREIGN KEY `referral_history_referrerTempId_fkey`;

-- DropForeignKey
ALTER TABLE `referral_history` DROP FOREIGN KEY `referral_history_referrerUserId_fkey`;

-- DropForeignKey
ALTER TABLE `referral_links` DROP FOREIGN KEY `referral_links_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `referral_links` DROP FOREIGN KEY `referral_links_userId_fkey`;

-- DropForeignKey
ALTER TABLE `salary_profiles` DROP FOREIGN KEY `salary_profiles_userId_fkey`;

-- DropForeignKey
ALTER TABLE `settlements` DROP FOREIGN KEY `settlements_fromMemberId_fkey`;

-- DropForeignKey
ALTER TABLE `settlements` DROP FOREIGN KEY `settlements_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `settlements` DROP FOREIGN KEY `settlements_toMemberId_fkey`;

-- DropForeignKey
ALTER TABLE `shared_budgets` DROP FOREIGN KEY `shared_budgets_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `shared_subscriptions` DROP FOREIGN KEY `shared_subscriptions_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `shared_subscriptions` DROP FOREIGN KEY `shared_subscriptions_paidByMemberId_fkey`;

-- DropForeignKey
ALTER TABLE `subscription_members` DROP FOREIGN KEY `subscription_members_memberId_fkey`;

-- DropForeignKey
ALTER TABLE `subscription_members` DROP FOREIGN KEY `subscription_members_subscriptionId_fkey`;

-- DropForeignKey
ALTER TABLE `temp_user_chat_reads` DROP FOREIGN KEY `temp_user_chat_reads_tempUserId_fkey`;

-- DropForeignKey
ALTER TABLE `trip_days` DROP FOREIGN KEY `trip_days_tripId_fkey`;

-- DropForeignKey
ALTER TABLE `trips` DROP FOREIGN KEY `trips_groupId_fkey`;

-- DropTable
DROP TABLE `challenge_badges`;

-- DropTable
DROP TABLE `challenge_participants`;

-- DropTable
DROP TABLE `contribution_rules`;

-- DropTable
DROP TABLE `conversion_events`;

-- DropTable
DROP TABLE `couple_finance_profiles`;

-- DropTable
DROP TABLE `expense_attachments`;

-- DropTable
DROP TABLE `expense_comments`;

-- DropTable
DROP TABLE `expense_splits`;

-- DropTable
DROP TABLE `financial_reports`;

-- DropTable
DROP TABLE `grocery_items`;

-- DropTable
DROP TABLE `group_access_restrictions`;

-- DropTable
DROP TABLE `group_activity_events`;

-- DropTable
DROP TABLE `group_chat_messages`;

-- DropTable
DROP TABLE `group_chats`;

-- DropTable
DROP TABLE `group_expenses`;

-- DropTable
DROP TABLE `group_incomes`;

-- DropTable
DROP TABLE `group_invitations`;

-- DropTable
DROP TABLE `group_lifecycle_events`;

-- DropTable
DROP TABLE `group_lifecycle_notifications`;

-- DropTable
DROP TABLE `group_member_removal_logs`;

-- DropTable
DROP TABLE `group_member_temp`;

-- DropTable
DROP TABLE `group_members`;

-- DropTable
DROP TABLE `group_polls`;

-- DropTable
DROP TABLE `install_tracking`;

-- DropTable
DROP TABLE `invite_links`;

-- DropTable
DROP TABLE `life_event_contributors`;

-- DropTable
DROP TABLE `life_event_expenses`;

-- DropTable
DROP TABLE `life_events`;

-- DropTable
DROP TABLE `memory_entries`;

-- DropTable
DROP TABLE `onboarding_events`;

-- DropTable
DROP TABLE `poll_options`;

-- DropTable
DROP TABLE `poll_votes`;

-- DropTable
DROP TABLE `premium_trials`;

-- DropTable
DROP TABLE `qr_split_items`;

-- DropTable
DROP TABLE `qr_split_participants`;

-- DropTable
DROP TABLE `qr_split_sessions`;

-- DropTable
DROP TABLE `referral_history`;

-- DropTable
DROP TABLE `referral_links`;

-- DropTable
DROP TABLE `salary_profiles`;

-- DropTable
DROP TABLE `savings_challenges`;

-- DropTable
DROP TABLE `session_revocations`;

-- DropTable
DROP TABLE `settlements`;

-- DropTable
DROP TABLE `shared_budgets`;

-- DropTable
DROP TABLE `shared_finance_groups`;

-- DropTable
DROP TABLE `shared_grocery_lists`;

-- DropTable
DROP TABLE `shared_subscriptions`;

-- DropTable
DROP TABLE `subscription_members`;

-- DropTable
DROP TABLE `temp_user_chat_reads`;

-- DropTable
DROP TABLE `temp_users`;

-- DropTable
DROP TABLE `trip_days`;

-- DropTable
DROP TABLE `trips`;

