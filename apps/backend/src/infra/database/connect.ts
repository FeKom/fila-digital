import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";

import { Database } from "./types";
import config from "../config";
import { logger } from "../../utils/logger";

const databaseConfig = config.get<{
  name: string;
  host: string;
  user: string;
  password: string;
  port: number;
  ssl: boolean;
  applicationName: string;
  statementTimeoutMs: number;
  slowQueryThresholdMs: number;
  connection: {
    max: number;
    timeoutInMilli: number;
    idleTimeoutInMilli: number;
  };
}>("database");

// application_name appears in pg_stat_activity.application_name and in every
// log line (via %a in log_line_prefix), making it easy to filter backend
// queries from psql/migration queries in Loki or pg_stat_activity.
//
// statement_timeout is passed as a server-side connection option so PostgreSQL
// automatically aborts any query that runs longer than this duration.
// This prevents a single runaway query from holding a connection indefinitely.
export const dialect = new PostgresDialect({
  pool: new Pool({
    database: databaseConfig.name,
    host: databaseConfig.host,
    user: databaseConfig.user,
    password: databaseConfig.password,
    port: databaseConfig.port,
    max: databaseConfig.connection.max,
    connectionTimeoutMillis: databaseConfig.connection.timeoutInMilli,
    idleTimeoutMillis: databaseConfig.connection.idleTimeoutInMilli,
    ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false,
    // PostgreSQL connection parameters set per-connection
    application_name: databaseConfig.applicationName,
    options: `-c statement_timeout=${databaseConfig.statementTimeoutMs}`,
  }),
});

export const db = new Kysely<Database>({
  dialect,

  // Slow query logger: warns when a query exceeds the configured threshold.
  // This catches N+1 patterns, missing indexes, and accidental full-table
  // scans during development before they reach production.
  // The threshold is configurable per environment (lower in dev, higher in prod).
  log(event) {
    if (event.level === "query") {
      if (event.queryDurationMillis > databaseConfig.slowQueryThresholdMs) {
        logger.warn({
          msg: "slow query",
          duration_ms: Math.round(event.queryDurationMillis),
          threshold_ms: databaseConfig.slowQueryThresholdMs,
          sql: event.query.sql,
        });
      }
    }

    if (event.level === "error") {
      logger.error({
        msg: "query error",
        error: String(event.error),
        sql: event.query.sql,
      });
    }
  },
});
