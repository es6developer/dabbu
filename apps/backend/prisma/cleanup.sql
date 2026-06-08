-- ============================================================
-- DABBU DATABASE CLEANUP
-- Removes ALL user data while preserving master/seed data.
--
-- Master data preserved (user records kept, their data wiped):
--   System user system@dabbu.internal  → owns default categories
--   Demo user   demo@dabbu.app         → user record kept, all data wiped
--   subscription_plans                  → premium tiers
--   currencies                          → supported currencies
--   admin_users                         → admin panel accounts
--   app_configuration                   → app-wide settings
--   feature_flags                       → feature toggles
--
-- Run:
--   mysql -h <host> -u <user> -p<pass> <db> < apps/backend/prisma/cleanup.sql
-- ============================================================

SET SQL_SAFE_UPDATES = 0;

-- ═══════════════════════════════════════════════════════════
-- 1. DELETE FROM TABLES WITH NoAction/SET NULL USER FKs
--    These must be deleted BEFORE the user DELETE, otherwise
--    FK constraints will block it.
--
--    We also delete from CASCADE tables here so they are
--    cleaned up even if the final user DELETE fails.
--
--    NOTE: Using literals 'system@dabbu.internal' / 'demo@dabbu.app'
--    instead of session variables to avoid collation mismatch errors.
-- ═══════════════════════════════════════════════════════════

-- Users to target
SET @target_users = NULL;

-- Shared expenses (NoAction FK on paidBy)
DELETE se FROM shared_expenses se
JOIN users u ON u.id = se.paidBy
WHERE u.email NOT IN ('system@dabbu.internal');

-- Settlements (NoAction FK on fromUserId and toUserId)
DELETE s1 FROM settlements s1
JOIN users u ON u.id = s1.fromUserId
WHERE u.email NOT IN ('system@dabbu.internal');

DELETE s2 FROM settlements s2
JOIN users u ON u.id = s2.toUserId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Audit (NoAction)
DELETE al FROM audit_logs al
JOIN users u ON u.id = al.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Analytics events (SetNull)
DELETE ae FROM analytics_events ae
JOIN users u ON u.id = ae.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Login activity
DELETE la FROM login_activity la
JOIN users u ON u.id = la.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Notification logs
DELETE nl FROM notification_logs nl
JOIN users u ON u.id = nl.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Notifications
DELETE n FROM notifications n
JOIN users u ON u.id = n.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Sessions
DELETE s FROM sessions s
JOIN users u ON u.id = s.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Devices
DELETE d FROM devices d
JOIN users u ON u.id = d.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Contact hashes
DELETE ch FROM contact_hashes ch
JOIN users u ON u.id = ch.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Friends (both sides)
DELETE f1 FROM friends f1
JOIN users u ON u.id = f1.userId
WHERE u.email NOT IN ('system@dabbu.internal');

DELETE f2 FROM friends f2
JOIN users u ON u.id = f2.friendId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Expense splits (NoAction)
DELETE es FROM expense_splits es
JOIN users u ON u.id = es.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Household contributions (NoAction)
DELETE hc FROM household_contributions hc
JOIN users u ON u.id = hc.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Shared goal contributions (NoAction)
DELETE sgc FROM shared_goal_contributions sgc
JOIN users u ON u.id = sgc.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Group wallet members (NoAction)
DELETE gwm FROM group_wallet_members gwm
JOIN users u ON u.id = gwm.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Advance contribution history (NoAction)
DELETE ach FROM advance_contribution_history ach
JOIN users u ON u.id = ach.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Document permissions (NoAction)
DELETE dp FROM document_permissions dp
JOIN users u ON u.id = dp.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Bill splits (NoAction)
DELETE bs FROM bill_splits bs
JOIN users u ON u.id = bs.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Emergency contributions (NoAction)
DELETE ec FROM emergency_contributions ec
JOIN users u ON u.id = ec.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- User badges (NoAction)
DELETE ub FROM user_badges ub
JOIN users u ON u.id = ub.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- User documents (NoAction)
DELETE ud FROM user_documents ud
JOIN users u ON u.id = ud.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- User streaks (NoAction)
DELETE us FROM user_streaks us
JOIN users u ON u.id = us.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Export history (NoAction — FK is exportedBy, not userId)
DELETE eh FROM export_history eh
JOIN users u ON u.id = eh.exportedBy
WHERE u.email NOT IN ('system@dabbu.internal');

-- SMS detections
DELETE sd FROM sms_detections sd
JOIN users u ON u.id = sd.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Group chat messages (NoAction on senderId)
DELETE gcm FROM group_chat_messages gcm
JOIN users u ON u.id = gcm.senderId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Group chat reads (NoAction on userId)
DELETE gcr FROM group_chat_reads gcr
JOIN users u ON u.id = gcr.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Shared_group_members (we need to delete by userId since group is CASCADE, but userId is also CASCADE — redundant for safety)
DELETE sgm FROM shared_group_members sgm
JOIN users u ON u.id = sgm.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Expense_group_members (same as above)
DELETE egm FROM expense_group_members egm
JOIN users u ON u.id = egm.userId
WHERE u.email NOT IN ('system@dabbu.internal');

-- Shared groups (CASCADE, but explicit for safety)
DELETE sg FROM shared_groups sg
JOIN users u ON u.id = sg.createdBy
WHERE u.email NOT IN ('system@dabbu.internal');

-- Expense groups (CASCADE, explicit for safety)
DELETE eg FROM expense_groups eg
JOIN users u ON u.id = eg.createdBy
WHERE u.email NOT IN ('system@dabbu.internal');

-- ═══════════════════════════════════════════════════════════
-- 2. DELETE THE REAL USERS
--    Temporarily disable FK checks as a safety net — if we
--    missed any NoAction table, the DELETE still succeeds.
--    CASCADE won't fire during this block, so we rely on the
--    explicit DELETEs above.
-- ═══════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM users
WHERE email NOT IN ('system@dabbu.internal', 'demo@dabbu.app');

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════
-- 3. CLEAN UP ORPHANED RECORDS
--    Anything with a SET NULL or that we missed above.
-- ═══════════════════════════════════════════════════════════

-- Orphaned categories (non-default, user gone)
DELETE tc FROM transaction_categories tc
LEFT JOIN users u ON u.id = tc.userId
WHERE u.id IS NULL AND tc.isDefault = 0;

-- Orphaned analytics events (SET NULL → userId should be null, but clean any non-null orphans)
DELETE ae FROM analytics_events ae
WHERE ae.userId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ae.userId);

-- Orphaned audit logs
DELETE al FROM audit_logs al
WHERE al.userId IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = al.userId);

-- Orphaned sessions
DELETE s FROM sessions s
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.userId);

-- Orphaned devices
DELETE d FROM devices d
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = d.userId);

-- Orphaned notifications
DELETE n FROM notifications n
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n.userId);

-- Orphaned shared_expenses
DELETE se FROM shared_expenses se
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = se.paidBy);

-- Orphaned settlements
DELETE s1 FROM settlements s1
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s1.fromUserId)
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s1.toUserId);

-- ═══════════════════════════════════════════════════════════
-- 4. VERIFICATION
-- ═══════════════════════════════════════════════════════════

SELECT '' AS '';
SELECT '=== MASTER DATA PRESERVED ===' AS status;
SELECT email, id FROM users WHERE email = 'system@dabbu.internal' OR email = 'demo@dabbu.app';
SELECT CONCAT('Subscription plans: ', COUNT(*)) FROM subscription_plans;
SELECT CONCAT('Currencies: ', COUNT(*)) FROM currencies;
SELECT CONCAT('Admin users: ', COUNT(*)) FROM admin_users;
SELECT CONCAT('Default categories: ', COUNT(*)) FROM transaction_categories WHERE isDefault = 1;
SELECT CONCAT('Non-default categories (should be 0): ', COUNT(*)) FROM transaction_categories WHERE isDefault = 0;
SELECT CONCAT('Users remaining (should be 2): ', COUNT(*)) FROM users;
SELECT '' AS '';
SELECT '=== ORPHAN CHECKS (should all be 0) ===' AS status;
SELECT CONCAT('Analytics events orphans: ', COUNT(*)) FROM analytics_events WHERE userId IS NOT NULL;
SELECT CONCAT('Audit logs orphans: ', COUNT(*)) FROM audit_logs WHERE userId IS NOT NULL;
SELECT CONCAT('Sessions orphans: ', COUNT(*)) FROM sessions s LEFT JOIN users u ON u.id = s.userId WHERE u.id IS NULL;
SELECT CONCAT('Devices orphans: ', COUNT(*)) FROM devices d LEFT JOIN users u ON u.id = d.userId WHERE u.id IS NULL;
SELECT CONCAT('Notifications orphans: ', COUNT(*)) FROM notifications n LEFT JOIN users u ON u.id = n.userId WHERE u.id IS NULL;
SELECT CONCAT('Shared expenses orphans: ', COUNT(*)) FROM shared_expenses se LEFT JOIN users u ON u.id = se.paidBy WHERE u.id IS NULL;
SELECT CONCAT('Settlements orphans: ', COUNT(*)) FROM settlements s LEFT JOIN users u ON u.id = s.fromUserId WHERE u.id IS NULL;
SELECT CONCAT('Shared groups remaining (should be 0): ', COUNT(*)) FROM shared_groups;
SELECT CONCAT('Expense groups remaining (should be 0): ', COUNT(*)) FROM expense_groups;
SELECT CONCAT('Shared group members remaining (should be 0): ', COUNT(*)) FROM shared_group_members;
SELECT CONCAT('Expense group members remaining (should be 0): ', COUNT(*)) FROM expense_group_members;
SELECT CONCAT('Friends remaining (should be 0): ', COUNT(*)) FROM friends;
