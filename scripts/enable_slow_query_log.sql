-- Enable MySQL slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/mysql-slow.log';
SET GLOBAL long_query_time = 1;  -- Log queries taking > 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';
SET GLOBAL log_slow_admin_statements = 'ON';
SET GLOBAL log_slow_slave_statements = 'ON';
SET GLOBAL min_examined_row_limit = 100;  -- Only log queries examining > 100 rows
