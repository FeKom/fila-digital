-- ─────────────────────────────────────────────────────────────────────────────
-- PostgreSQL initialization — Fila Digital
-- Executed once when the container starts with an empty data directory.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable query statistics tracking.
-- Requires shared_preload_libraries = 'pg_stat_statements' in postgresql.conf.
-- After CREATE EXTENSION, query pg_stat_statements to see normalized queries,
-- call counts, total/mean/stddev execution time, and rows returned.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ── Monitoring user ───────────────────────────────────────────────────────────
--
-- Least-privilege user for postgres_exporter. The pg_monitor role grants
-- read access to all pg_stat_* views without superuser privileges.
-- Never use the superuser (postgres) for the exporter in production.
--
CREATE USER exporter_user WITH PASSWORD 'exporter_password';
GRANT pg_monitor TO exporter_user;

-- Allow the exporter to connect to the database
GRANT CONNECT ON DATABASE "fila-digital" TO exporter_user;
