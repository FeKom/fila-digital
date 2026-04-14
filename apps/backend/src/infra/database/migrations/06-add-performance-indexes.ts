import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Hot path: listar/buscar participantes ativos por fila
  await sql`CREATE INDEX idx_participants_queue_queue_active ON participants_queue(queue_id, is_active) WHERE is_active = true`.execute(
    db
  );

  // Hot path: verificar se usuário já está na fila
  await sql`CREATE INDEX idx_participants_queue_person_queue_active ON participants_queue(person_id, queue_id, is_active) WHERE is_active = true`.execute(
    db
  );

  // Buscar fila por comércio (usado em toda request de participants-queue)
  await sql`CREATE INDEX idx_queue_commerce_id ON queue(commerce_id)`.execute(
    db
  );

  // Buscar comércio por owner (verificação de permissão)
  await sql`CREATE INDEX idx_commerce_owner_id ON commerce(owner_id)`.execute(
    db
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_participants_queue_queue_active`.execute(
    db
  );
  await sql`DROP INDEX IF EXISTS idx_participants_queue_person_queue_active`.execute(
    db
  );
  await sql`DROP INDEX IF EXISTS idx_queue_commerce_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_commerce_owner_id`.execute(db);
}
