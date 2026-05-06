import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Create the normalized address table
  await db.schema
    .createTable("address")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("commerce_id", "uuid", (col) =>
      col.notNull().references("commerce.id").onDelete("cascade")
    )
    .addColumn("street", "text")
    .addColumn("number", "text")
    .addColumn("complement", "text")
    .addColumn("neighborhood", "text")
    .addColumn("city", "text")
    .addColumn("state", "char(2)")
    .addColumn("cep", "text")
    .addColumn("latitude", sql`decimal(10, 8)`)
    .addColumn("longitude", sql`decimal(11, 8)`)
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Unique index enforces 1:1 commerce→address for now
  await sql`
    CREATE UNIQUE INDEX address_commerce_id_idx ON address (commerce_id)
  `.execute(db);

  // Migrate existing location data from commerce to address
  await sql`
    INSERT INTO address (commerce_id, cep, latitude, longitude)
    SELECT id, cep, latitude, longitude
    FROM commerce
    WHERE cep IS NOT NULL
       OR latitude IS NOT NULL
       OR longitude IS NOT NULL
  `.execute(db);

  // Drop the flat columns from commerce
  await db.schema
    .alterTable("commerce")
    .dropColumn("latitude")
    .dropColumn("longitude")
    .dropColumn("cep")
    .dropColumn("address")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Restore flat columns on commerce
  await db.schema
    .alterTable("commerce")
    .addColumn("latitude", sql`decimal(10, 8)`)
    .addColumn("longitude", sql`decimal(11, 8)`)
    .addColumn("cep", "text")
    .addColumn("address", "text")
    .execute();

  // Copy data back
  await sql`
    UPDATE commerce c
    SET
      cep = a.cep,
      latitude = a.latitude,
      longitude = a.longitude
    FROM address a
    WHERE a.commerce_id = c.id
  `.execute(db);

  await db.schema.dropTable("address").execute();
}
