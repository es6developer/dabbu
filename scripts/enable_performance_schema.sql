-- Enable MySQL Performance Schema (add to my.cnf)
-- [mysqld]
-- performance_schema=ON
-- performance-schema-consumer-statements-digest=ON
-- performance-schema-consumer-global-instrumentation=ON
-- performance-schema-consumer-thread-instrumentation=ON

-- Query to find slow queries
SELECT * FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_TIMER_WAIT > 1000000000  -- Queries taking > 1 second
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;

-- Query to find most frequently executed queries
SELECT DIGEST_TEXT, COUNT_STAR, SUM_TIMER_WAIT, AVG_TIMER_WAIT
FROM performance_schema.events_statements_summary_by_digest
ORDER BY COUNT_STAR DESC
LIMIT 20;

-- Query to find queries not using indexes
SELECT * FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_NO_INDEX_USED > 0
ORDER BY SUM_NO_INDEX_USED DESC
LIMIT 20;
