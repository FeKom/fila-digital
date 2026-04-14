import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("queue")
    .addColumn("qrcode_token", "text", (col) => col.notNull())
    .execute();

  await sql`CREATE UNIQUE INDEX idx_queue_qrcode_token ON queue(qrcode_token)`.execute(
    db
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_queue_qrcode_token`.execute(db);
  await db.schema.alterTable("queue").dropColumn("qrcode_token").execute();
}
