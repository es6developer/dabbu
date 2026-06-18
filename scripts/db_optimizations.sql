-- ═══════════════════════════════════════════════════════════════════
-- DABBU — Database Optimization Migration (Phase 13)
-- Applies missing indexes, fulltext indexes, archiving, and tuning
-- ═══════════════════════════════════════════════════════════════════
-- Migration: 013_db_optimizations
-- Description: Composite indexes, soft-delete indexes, fulltext
--              indexes, archiving stored procedure, partitioning docs
-- ───────────────────────────────────────────────────────────────────
-- NOTE: MySQL does not support CREATE INDEX IF NOT EXISTS natively.
-- We use information_schema-based conditional creation for idempotency.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Helper: Stored procedure to safely create indexes ──────────
-- This avoids errors when re-running the migration.

DELIMITER //

DROP PROCEDURE IF EXISTS create_index_if_not_exists //
CREATE PROCEDURE create_index_if_not_exists(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_sql  TEXT
)
BEGIN
  DECLARE idx_count INT DEFAULT 0;

  SELECT COUNT(*)
    INTO idx_count
    FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name   = p_table_name
     AND index_name   = p_index_name;

  IF idx_count = 0 THEN
    SET @stmt = p_index_sql;
    PREPARE stmt FROM @stmt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

-- ═══════════════════════════════════════════════════════════════════
-- 1. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ═══════════════════════════════════════════════════════════════════

-- Transactions: user + date + category (most common filter pattern)
CALL create_index_if_not_exists(
  'transactions',
  'idx_transactions_user_date_category',
  'CREATE INDEX idx_transactions_user_date_category ON transactions(userId, date, categoryId)'
);

-- Transactions: user + amount (for spending queries / top-spend analysis)
CALL create_index_if_not_exists(
  'transactions',
  'idx_transactions_user_amount',
  'CREATE INDEX idx_transactions_user_amount ON transactions(userId, amount)'
);

-- Bills: user + dueDate + isPaid (recurring bill queries, overdue detection)
-- Note: bills table uses `isPaid` boolean, not `status` string
CALL create_index_if_not_exists(
  'bills',
  'idx_bills_user_due_status',
  'CREATE INDEX idx_bills_user_due_status ON bills(userId, dueDate, isPaid)'
);

-- Goals: user + deadline + isCompleted (goal tracking queries, approaching deadline)
-- Note: goals table uses `deadline` (not targetDate) and `isCompleted` (not status)
CALL create_index_if_not_exists(
  'goals',
  'idx_goals_user_target_status',
  'CREATE INDEX idx_goals_user_target_status ON goals(userId, deadline, isCompleted)'
);

-- Notifications: user + createdAt + isRead (notification feed, unread badge count)
CALL create_index_if_not_exists(
  'notifications',
  'idx_notifications_user_created_read',
  'CREATE INDEX idx_notifications_user_created_read ON notifications(userId, createdAt, isRead)'
);

-- AuditLogs: createdAt (time-based range queries, cleanup jobs)
-- Covered by existing @@index([createdAt]) in schema, included here for completeness.
CALL create_index_if_not_exists(
  'audit_logs',
  'idx_audit_logs_created_at',
  'CREATE INDEX idx_audit_logs_created_at ON audit_logs(createdAt)'
);

-- Sessions: userId + expiresAt (session cleanup, active session queries)
CALL create_index_if_not_exists(
  'sessions',
  'idx_sessions_user_expires',
  'CREATE INDEX idx_sessions_user_expires ON sessions(userId, expiresAt)'
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. FULLTEXT INDEXES
-- ═══════════════════════════════════════════════════════════════════
-- Note: Prisma @@fulltext already generates these via prisma migrate.
-- We include them here for completeness in raw SQL deployments.

CALL create_index_if_not_exists(
  'transactions',
  'ft_transactions_search',
  'ALTER TABLE transactions ADD FULLTEXT INDEX ft_transactions_search (description, notes)'
);

CALL create_index_if_not_exists(
  'goals',
  'ft_goals_search',
  'ALTER TABLE goals ADD FULLTEXT INDEX ft_goals_search (name, notes)'
);

CALL create_index_if_not_exists(
  'bills',
  'ft_bills_search',
  'ALTER TABLE bills ADD FULLTEXT INDEX ft_bills_search (name, notes, payee)'
);

CALL create_index_if_not_exists(
  'users',
  'ft_users_search',
  'ALTER TABLE users ADD FULLTEXT INDEX ft_users_search (firstName, lastName, email)'
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. SOFT-DELETE INDEXES
-- ═══════════════════════════════════════════════════════════════════
-- Ensure all soft-delete filtered queries use proper composite indexes.

-- Transactions: userId + deletedAt (filtering active vs soft-deleted)
CALL create_index_if_not_exists(
  'transactions',
  'idx_transactions_user_deleted',
  'CREATE INDEX idx_transactions_user_deleted ON transactions(userId, deletedAt)'
);

-- Goals: userId + deletedAt
CALL create_index_if_not_exists(
  'goals',
  'idx_goals_user_deleted',
  'CREATE INDEX idx_goals_user_deleted ON goals(userId, deletedAt)'
);

-- Bills: userId + deletedAt
CALL create_index_if_not_exists(
  'bills',
  'idx_bills_user_deleted',
  'CREATE INDEX idx_bills_user_deleted ON bills(userId, deletedAt)'
);

-- Budgets: userId + deletedAt
CALL create_index_if_not_exists(
  'budgets',
  'idx_budgets_user_deleted',
  'CREATE INDEX idx_budgets_user_deleted ON budgets(userId, deletedAt)'
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. ARCHIVE TABLES
-- ═══════════════════════════════════════════════════════════════════
-- These tables mirror the structure of their parent tables for cold storage.

CREATE TABLE IF NOT EXISTS transactions_archive LIKE transactions;
CREATE TABLE IF NOT EXISTS audit_logs_archive LIKE audit_logs;
CREATE TABLE IF NOT EXISTS notification_logs_archive LIKE notification_logs;

-- ═══════════════════════════════════════════════════════════════════
-- 5. ARCHIVING STORED PROCEDURE
-- ═══════════════════════════════════════════════════════════════════
-- Safely archives old soft-deleted data from large tables to _archive tables.
-- Designed to be called monthly via cron / scheduler.
-- Example call: CALL archive_old_data(CURDATE());

DELIMITER //

DROP PROCEDURE IF EXISTS archive_old_data //
CREATE PROCEDURE archive_old_data(IN archive_before DATE)
BEGIN
  -- Archive soft-deleted transactions older than 3 years
  INSERT INTO transactions_archive
  SELECT * FROM transactions
   WHERE date < archive_before
     AND deletedAt IS NOT NULL;

  DELETE FROM transactions
   WHERE date < archive_before
     AND deletedAt IS NOT NULL
   LIMIT 1000;

  -- Archive audit logs older than 3 years (createdAt is older than archive_before - 2y)
  INSERT INTO audit_logs_archive
  SELECT * FROM audit_logs
   WHERE createdAt < DATE_SUB(archive_before, INTERVAL 2 YEAR);

  DELETE FROM audit_logs
   WHERE createdAt < DATE_SUB(archive_before, INTERVAL 2 YEAR)
   LIMIT 1000;

  -- Archive notification logs older than 6 months
  INSERT INTO notification_logs_archive
  SELECT * FROM notification_logs
   WHERE createdAt < DATE_SUB(archive_before, INTERVAL 6 MONTH);

  DELETE FROM notification_logs
   WHERE createdAt < DATE_SUB(archive_before, INTERVAL 6 MONTH)
   LIMIT 1000;
END //

DELIMITER ;

-- ═══════════════════════════════════════════════════════════════════
-- 6. PARTITIONING STRATEGY (documentation / future work)
-- ═══════════════════════════════════════════════════════════════════
-- The following tables are candidates for RANGE COLUMNS partitioning
-- on their date/time columns when they exceed ~10M rows.
--
--   transactions:      RANGE COLUMNS on `date`       → monthly partitions
--   analytics_events:  RANGE COLUMNS on `timestamp`  → monthly partitions
--   audit_logs:        RANGE COLUMNS on `createdAt`  → monthly partitions
--   notification_logs: RANGE COLUMNS on `createdAt`  → monthly partitions
--
-- Example partition DDL (uncomment and adapt when ready):
--
-- ALTER TABLE transactions
--   PARTITION BY RANGE COLUMNS(date) (
--     PARTITION p_2024_q1 VALUES LESS THAN ('2024-04-01'),
--     PARTITION p_2024_q2 VALUES LESS THAN ('2024-07-01'),
--     PARTITION p_2024_q3 VALUES LESS THAN ('2024-10-01'),
--     PARTITION p_2024_q4 VALUES LESS THAN ('2025-01-01'),
--     PARTITION p_future   VALUES LESS THAN (MAXVALUE)
--   );
--
-- For time-series tables use RANGE COLUMNS on the timestamp column with
-- monthly or quarterly partition ranges. Partition pruning will drastically
-- improve range-scan performance and simplify data purging (DROP PARTITION).

-- ═══════════════════════════════════════════════════════════════════
-- 7. PRISMA CONNECTION POOL TUNING ADVICE
-- ═══════════════════════════════════════════════════════════════════
-- Prisma uses a built-in connection pool (PgBouncer-compatible via
-- pgBouncer or direct MySQL connections). For optimal performance:
--
-- ┌──────────────────────────────┬──────────────┬──────────────────┐
-- │ Variable                     │ Recommended  │ Notes            │
-- ├──────────────────────────────┼──────────────┼──────────────────┤
-- │ DATABASE_URL pool timeout    │ 10s          │ connection_limit │
-- │ Prisma connection_limit      │ 5-10         │ per server       │
-- │ Prisma pool_timeout          │ 10           │ seconds          │
-- │ MySQL max_connections        │ 151+         │ system variable  │
-- │ MySQL innodb_buffer_pool_size│ 70-80% of RAM│ for large dbs    │
-- │ MySQL innodb_log_file_size   │ 512M - 1G    │ for write-heavy  │
-- │ MySQL tmp_table_size         │ 64M          │ for aggregations │
-- │ MySQL max_heap_table_size    │ 64M          │ match tmp_table  │
-- └──────────────────────────────┴──────────────┴──────────────────┘
--
-- Example DATABASE_URL with pool settings:
--   mysql://user:pass@host:3306/dabbu?connection_limit=8&pool_timeout=10
--
-- Recommended Prisma accelerator / connection pooling:
--   Production:   Use a dedicated connection pooler (PlanetScale, PgBouncer,
--                 ProxySQL) to manage 100+ concurrent connections.
--   Staging:      connection_limit=5 is sufficient.
--   Development:  connection_limit=2 is sufficient.
--
-- Key indexing best practices for Prisma:
--   • Every @relation field should have an index on the FK column.
--     (Prisma auto-indexes @id and @@unique, but NOT foreign keys.)
--   • Composite indexes should match the exact WHERE + ORDER BY patterns.
--   • Use @@index([col1, col2, col3]) for multi-column filters.
--   • Avoid over-indexing; each index slows writes by ~2-5%.

-- ═══════════════════════════════════════════════════════════════════
-- CLEANUP: Drop the helper procedure
-- ═══════════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS create_index_if_not_exists;

-- ═══════════════════════════════════════════════════════════════════
-- End of migration
-- ═══════════════════════════════════════════════════════════════════
