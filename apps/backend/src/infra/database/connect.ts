import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";

import { Database } from "./types"; // this is the Database interface we defined earlier
import config from "../config";

const databaseConfig = config.get<{
  name: string;
  host: string;
  user: string;
  password: string;
  port: number;
  ssl: boolean;
  connection: {
    max: number;
    timeoutInMilli: number;
  };
}>("database");

export const dialect = new PostgresDialect({
  pool: new Pool({
    database: databaseConfig.name,
    host: databaseConfig.host,
    user: databaseConfig.user,
    password: databaseConfig.password,
    port: databaseConfig.port,
    max: databaseConfig.connection.max,
    connectionTimeoutMillis: databaseConfig.connection.timeoutInMilli,
    ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false,
  }),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
  dialect,
});
