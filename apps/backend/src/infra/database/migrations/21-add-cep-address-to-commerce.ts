import { Kysely } from "kysely";

export const up = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema
    .alterTable("commerce")
    .addColumn("cep", "text")
    .addColumn("address", "text")
    .execute();
};

export const down = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema
    .alterTable("commerce")
    .dropColumn("cep")
    .dropColumn("address")
    .execute();
};
