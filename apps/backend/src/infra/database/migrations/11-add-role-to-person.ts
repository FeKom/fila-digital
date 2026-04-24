import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TYPE person_role AS ENUM ('OWNER', 'ADMIN', 'CUSTOMER')`.execute(
    db
  );

  await db.schema
    .alterTable("person")
    .addColumn("role", sql`person_role`, (col) =>
      col.notNull().defaultTo("CUSTOMER")
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("person").dropColumn("role").execute();
  await sql`DROP TYPE person_role`.execute(db);
}
