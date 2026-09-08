import { db } from "../../../infra/database/connect";
import { Plan } from "../../../infra/database/types";

/**
 * Plano vigente de um usuário.
 *
 * Os limites viviam como constantes espalhadas pelos controllers — `>= 3` em
 * commerce.controller.ts e o limite de 1 fila implícito em queue.controller.ts.
 * Mudá-los exigia deploy. Agora são colunas, alteráveis por SQL.
 */
export const getPlanByPersonId = async (
  personId: string
): Promise<Plan | undefined> =>
  db
    .selectFrom("person")
    .innerJoin("plan", "plan.id", "person.plan_id")
    .selectAll("plan")
    .where("person.id", "=", personId)
    .executeTakeFirst();

/** Usado como fallback e na criação de usuário. */
export const getPlanByCode = async (code: string): Promise<Plan | undefined> =>
  db.selectFrom("plan").selectAll().where("code", "=", code).executeTakeFirst();

export const listActivePlans = async (): Promise<Plan[]> =>
  db
    .selectFrom("plan")
    .selectAll()
    .where("active", "=", true)
    .orderBy("price_cents", "asc")
    .execute();
