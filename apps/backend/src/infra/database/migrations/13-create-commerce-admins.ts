import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("commerce_admins")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("commerce_id", "uuid", (col) =>
      col.notNull().references("commerce.id").onDelete("cascade")
    )
    .addColumn("person_id", "uuid", (col) =>
      col.notNull().references("person.id").onDelete("cascade")
    )
    .addColumn("granted_by", "uuid", (col) =>
      col.notNull().references("person.id").onDelete("cascade")
    )
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  await db.schema
    .createIndex("idx_commerce_admins_commerce_id")
    .on("commerce_admins")
    .column("commerce_id")
    .execute();

  await db.schema
    .createIndex("idx_commerce_admins_person_id")
    .on("commerce_admins")
    .column("person_id")
    .execute();

  // Unique constraint: one admin grant per person per commerce
  await db.schema
    .createIndex("idx_commerce_admins_unique")
    .on("commerce_admins")
    .columns(["commerce_id", "person_id"])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("commerce_admins").execute();
}
