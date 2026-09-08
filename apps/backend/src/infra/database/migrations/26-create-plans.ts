import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  await sql`
    CREATE TABLE plan (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      code        VARCHAR(30)  NOT NULL UNIQUE,
      name        VARCHAR(80)  NOT NULL,
      description TEXT,

      -- Limites como COLUNAS, não constantes no código. Antes viviam
      -- espalhados: "3" em commerce.controller.ts e o limite de 1 fila
      -- implícito em queue.controller.ts. Mudá-los exigia deploy.
      max_commerces                  INTEGER NOT NULL,
      max_active_queues_per_commerce INTEGER NOT NULL,
      -- NULL = ilimitado. Distingue "sem limite" de "limite zero", que um
      -- INTEGER NOT NULL não conseguiria expressar.
      max_participants_per_queue     INTEGER,

      -- Preço em CENTAVOS. Float para dinheiro acumula erro de arredondamento:
      -- 0.1 + 0.2 nunca é 0.3 em ponto flutuante binário.
      price_cents INTEGER      NOT NULL DEFAULT 0,

      active      BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // Plano gratuito. max_commerces = 2 (era 3 fixo no código).
  await sql`
    INSERT INTO plan (code, name, description, max_commerces,
                      max_active_queues_per_commerce, max_participants_per_queue,
                      price_cents)
    VALUES ('free', 'Gratuito',
            'Para começar: até 2 comércios e 1 fila ativa por comércio.',
            2, 1, NULL, 0)
  `.execute(db);

  await sql`ALTER TABLE person ADD COLUMN plan_id UUID REFERENCES plan(id)`.execute(
    db
  );

  // Todo mundo que já existe entra no gratuito. Sem isto, usuários antigos
  // ficariam com plan_id NULL e a validação não saberia o que aplicar.
  await sql`
    UPDATE person SET plan_id = (SELECT id FROM plan WHERE code = 'free')
    WHERE plan_id IS NULL
  `.execute(db);

  // Só agora torna obrigatório — depois do backfill, nunca antes.
  await sql`ALTER TABLE person ALTER COLUMN plan_id SET NOT NULL`.execute(db);

  await sql`CREATE INDEX idx_person_plan ON person(plan_id)`.execute(db);
}

export async function down(db: Kysely<unknown>) {
  await sql`DROP INDEX IF EXISTS idx_person_plan`.execute(db);
  await sql`ALTER TABLE person DROP COLUMN IF EXISTS plan_id`.execute(db);
  await sql`DROP TABLE IF EXISTS plan`.execute(db);
}
