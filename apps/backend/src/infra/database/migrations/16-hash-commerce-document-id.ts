import { Kysely, sql } from "kysely";
import { hashDocument } from "../../../utils/documentHash";

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
