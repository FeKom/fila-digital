import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  // PostgreSQL does not support ALTER TYPE ... DROP VALUE.
  // Recreate the enum without the ADMIN value.

  // 1. Demote any existing ADMIN rows to CUSTOMER
  await sql`UPDATE person SET role = 'CUSTOMER' WHERE role = 'ADMIN'`.execute(
    db
  );

  // 2. Create the replacement enum
  await sql`CREATE TYPE person_role_new AS ENUM ('OWNER', 'CUSTOMER')`.execute(
    db
  );

  // 3. Swap the column to the new type
  await sql`
    ALTER TABLE person
      ALTER COLUMN role TYPE person_role_new
        USING role::text::person_role_new
  `.execute(db);

  // 4. Drop the old type and rename the new one
  await sql`DROP TYPE person_role`.execute(db);
  await sql`ALTER TYPE person_role_new RENAME TO person_role`.execute(db);
}

export async function down(db: Kysely<unknown>) {
  // Restore the ADMIN value
  await sql`CREATE TYPE person_role_new AS ENUM ('OWNER', 'ADMIN', 'CUSTOMER')`.execute(
    db
  );

  await sql`
    ALTER TABLE person
      ALTER COLUMN role TYPE person_role_new
        USING role::text::person_role_new
  `.execute(db);

  await sql`DROP TYPE person_role`.execute(db);
  await sql`ALTER TYPE person_role_new RENAME TO role`.execute(db);
}
