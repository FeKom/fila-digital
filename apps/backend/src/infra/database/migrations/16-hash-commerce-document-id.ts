import { Kysely, sql } from "kysely";
import { createHmac } from "crypto";

// Read from env directly — migrations run outside the full app bootstrap
const secret = process.env.AUTH_TOKEN ?? "F996A2C8-80AC-4BDD-A5DA-1BF75811CFA7";

const hashDocument = (doc: string): string =>
  createHmac("sha256", secret).update(doc).digest("hex");

interface CommerceRow {
  id: string;
  document_id: string;
}

export async function up(db: Kysely<unknown>): Promise<void> {
  const rows = await sql<CommerceRow>`
    SELECT id, document_id FROM commerce
  `.execute(db);

  for (const row of rows.rows) {
    // Only hash values that look like a 14-digit CNPJ (not already hashed)
    if (/^\d{14}$/.test(row.document_id)) {
      const hashed = hashDocument(row.document_id);
      await sql`
        UPDATE commerce SET document_id = ${hashed} WHERE id = ${row.id}
      `.execute(db);
    }
  }
}

// Hash is one-way — restore from backup if a rollback is needed
export async function down(_db: Kysely<unknown>): Promise<void> {}
