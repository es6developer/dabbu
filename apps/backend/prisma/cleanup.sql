-- ============================================================
-- DABBU DATABASE CLEANUP
-- Removes ALL user data while preserving master/seed data.
--
-- Master data preserved:
--   System user system@dabbu.internal  → owns default categories
--   Demo user   demo@dabbu.app         → test/demo account
--   subscription_plans                  → premium tiers
--   currencies                          → supported currencies
--   admin_users                         → admin panel accounts
--   app_configuration                   → app-wide settings
--   feature_flags                       → feature toggles
--
-- Run:
--   mysql -h <host> -u <user> -p<pass> <db> < apps/backend/prisma/cleanup.sql
-- ============================================================

SET @system_email = 'system@dabbu.internal';
SET @demo_email   = 'demo@dabbu.app';

-- Safety: disable foreign key checks so we can delete in any order.
-- CASCADE constraints WILL fire (MySQL fires them regardless).
SET FOREIGN_KEY_CHECKS = 0;

-- ═══════════════════════════════════════════════════════════
-- 1. TABLES THAT REFERENCE USER (userId / paidBy / createdBy / senderId / etc.)
--    Delete for all real users BEFORE deleting the user row.
--    (Many lack onDelete: Cascade in Prisma, e.g. AuditLog uses NoAction.)
-- ═══════════════════════════════════════════════════════════

-- Audit (NoAction → must delete explicitly)
DELETE al FROM audit_logs al JOIN users u ON u.id = al.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Analytics events (SetNull → safe but clean them anyway)
DELETE ae FROM analytics_events ae JOIN users u ON u.id = ae.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Login activity
DELETE la FROM login_activity la JOIN users u ON u.id = la.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Notification logs
DELETE nl FROM notification_logs nl JOIN users u ON u.id = nl.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Notifications
DELETE n FROM notifications n JOIN users u ON u.id = n.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Sessions
DELETE s FROM sessions s JOIN users u ON u.id = s.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Devices
DELETE d FROM devices d JOIN users u ON u.id = d.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Contact hashes
DELETE ch FROM contact_hashes ch JOIN users u ON u.id = ch.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Friends (initiated or added)
DELETE f FROM friends f WHERE f.userId IN (SELECT id FROM users WHERE email NOT IN (@system_email, @demo_email))
   OR f.friendId IN (SELECT id FROM users WHERE email NOT IN (@system_email, @demo_email));

-- Expense splits
DELETE es FROM expense_splits es JOIN users u ON u.id = es.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Household contributions
DELETE hc FROM household_contributions hc JOIN users u ON u.id = hc.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Shared goal contributions
DELETE sgc FROM shared_goal_contributions sgc JOIN users u ON u.id = sgc.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Group wallet members
DELETE gwm FROM group_wallet_members gwm JOIN users u ON u.id = gwm.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Advance contribution history
DELETE ach FROM advance_contribution_history ach JOIN users u ON u.id = ach.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Document permissions
DELETE dp FROM document_permissions dp JOIN users u ON u.id = dp.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Bill splits
DELETE bs FROM bill_splits bs JOIN users u ON u.id = bs.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Emergency contributions
DELETE ec FROM emergency_contributions ec JOIN users u ON u.id = ec.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- User badges
DELETE ub FROM user_badges ub JOIN users u ON u.id = ub.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- User documents
DELETE ud FROM user_documents ud JOIN users u ON u.id = ud.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- User streaks
DELETE us FROM user_streaks us JOIN users u ON u.id = us.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Export history
DELETE eh FROM export_histories eh JOIN users u ON u.id = eh.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- Settlement confirmations
DELETE sc FROM settlement_confirmations sc JOIN users u ON u.id = sc.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- SMS detections
DELETE sd FROM sms_detections sd JOIN users u ON u.id = sd.userId WHERE u.email NOT IN (@system_email, @demo_email);

-- ═══════════════════════════════════════════════════════════
-- 2. DELETE THE REAL USERS
--    CASCADE handles the rest: transactions, accounts, bills,
--    budgets, goals, shared_groups, shared_expenses,
--    settlements, reminders, subscriptions, etc.
-- ═══════════════════════════════════════════════════════════

DELETE FROM users
WHERE email NOT IN (@system_email, @demo_email);

-- ═══════════════════════════════════════════════════════════
-- 3. CLEAN UP ORPHANED CATEGORIES
--    Non-default categories whose user was deleted.
-- ═══════════════════════════════════════════════════════════

DELETE tc FROM transaction_categories tc
LEFT JOIN users u ON u.id = tc.userId
WHERE u.id IS NULL AND tc.isDefault = 0;

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════
-- 4. VERIFICATION
-- ═══════════════════════════════════════════════════════════

SELECT '' AS '';
SELECT '=== MASTER DATA PRESERVED ===' AS status;
SELECT email, id FROM users WHERE email IN (@system_email, @demo_email);
SELECT CONCAT('Subscription plans: ', COUNT(*)) FROM subscription_plans;
SELECT CONCAT('Currencies: ', COUNT(*)) FROM currencies;
SELECT CONCAT('Admin users: ', COUNT(*)) FROM admin_users;
SELECT CONCAT('Default categories: ', COUNT(*)) FROM transaction_categories WHERE isDefault = 1;
SELECT CONCAT('Non-default categories (should be 0): ', COUNT(*)) FROM transaction_categories WHERE isDefault = 0;
SELECT CONCAT('Users remaining (should be 2): ', COUNT(*)) FROM users;
SELECT CONCAT('Analytics events with orphan userId (should be 0): ', COUNT(*)) FROM analytics_events WHERE userId IS NOT NULL;
SELECT CONCAT('Audit logs with orphan userId (should be 0): ', COUNT(*)) FROM audit_logs WHERE userId IS NOT NULL;
SELECT CONCAT('Friends with orphan userId (should be 0): ', COUNT(*)) FROM friends f LEFT JOIN users u ON u.id = f.userId WHERE u.id IS NULL;
SELECT CONCAT('Sessions with orphan userId (should be 0): ', COUNT(*)) FROM sessions s LEFT JOIN users u ON u.id = s.userId WHERE u.id IS NULL;
SELECT CONCAT('Devices with orphan userId (should be 0): ', COUNT(*)) FROM devices d LEFT JOIN users u ON u.id = d.userId WHERE u.id IS NULL;
SELECT CONCAT('Notifications with orphan userId (should be 0): ', COUNT(*)) FROM notifications n LEFT JOIN users u ON u.id = n.userId WHERE u.id IS NULL;
