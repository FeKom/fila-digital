/* eslint-disable no-console */
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";
import { Database } from "../../infra/database/types";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool } from "pg";
import { promises as fs } from "fs";
import path from "path";

// define um tipo que tem as duas propriedades que vamos retornar
type DbInstance = {
  db: Kysely<Database>;
  container: StartedPostgreSqlContainer;
};

// função que roda as migrations
async function migrateToLatest(db: Kysely<Database>) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(
        __dirname,
        "../../../dist/infra/database/migrations"
      ),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();
  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    throw error;
  }
}

// função que configura o banco de dados de teste
export const setupTestDatabase = async (): Promise<DbInstance> => {
  // constroi o container com a mesma imagem que ta sendo usada em prod
  // ta quebrando aq embaixo, ta esperando o container ficar pronto, mas nao está ficando
  const container = await new PostgreSqlContainer("postgres:17.5-alpine")
    .withDatabase("test-db")
    .withUsername("test-user")
    .withPassword("test-pass")
    .withStartupTimeout(120000) // 2 minutos
    .withReuse()
    .start();

  // constroi o dialect para a comunicação do postgres usando as infos do container e de prod
  const dialect = new PostgresDialect({
    pool: new Pool({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      connectionString: container.getConnectionUri(),
      max: 10,
      connectionTimeoutMillis: 30000,
    }),
  });

  // constroi a instancia do Kysely com o dialect
  const db = new Kysely<Database>({
    dialect,
  });

  await migrateToLatest(db);
  // retorna o db e o container para podermos usar nos testes
  return { db, container };
};
