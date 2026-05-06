import { uuidv7 } from "uuidv7";
import { db } from "../../../infra/database/connect";
import { AddressUpdate, NewAddress } from "../../../infra/database/types";

export const upsertAddress = async (
  commerce_id: string,
  data: Omit<
    Partial<NewAddress>,
    "id" | "commerce_id" | "created_at" | "updated_at"
  >
) => {
  const updateData: AddressUpdate = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  return db
    .insertInto("address")
    .values({ id: uuidv7(), commerce_id, ...data })
    .onConflict((oc) => oc.column("commerce_id").doUpdateSet(updateData))
    .returningAll()
    .executeTakeFirst();
};

export const getAddressByCommerceId = async (commerce_id: string) => {
  return db
    .selectFrom("address")
    .selectAll()
    .where("commerce_id", "=", commerce_id)
    .executeTakeFirst();
};
