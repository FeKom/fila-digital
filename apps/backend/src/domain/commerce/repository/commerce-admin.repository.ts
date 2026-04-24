import { uuidv7 } from "uuidv7";
import { db } from "../../../infra/database/connect";
import { NewCommerceAdmin } from "../../../infra/database/types";

export const grantCommerceAdmin = async (
  commerceId: string,
  personId: string,
  grantedBy: string
): Promise<void> => {
  const record: NewCommerceAdmin = {
    id: uuidv7(),
    commerce_id: commerceId,
    person_id: personId,
    granted_by: grantedBy,
  };
  await db
    .insertInto("commerce_admins")
    .values(record)
    .onConflict((oc) => oc.doNothing())
    .execute();
};

export const revokeCommerceAdmin = async (
  commerceId: string,
  personId: string
): Promise<void> => {
  await db
    .deleteFrom("commerce_admins")
    .where("commerce_id", "=", commerceId)
    .where("person_id", "=", personId)
    .execute();
};

export const isCommerceAdmin = async (
  commerceId: string,
  personId: string
): Promise<boolean> => {
  const row = await db
    .selectFrom("commerce_admins")
    .select("id")
    .where("commerce_id", "=", commerceId)
    .where("person_id", "=", personId)
    .executeTakeFirst();
  return !!row;
};

export const listCommerceAdmins = async (commerceId: string) => {
  return db
    .selectFrom("commerce_admins as ca")
    .innerJoin("person as p", "p.id", "ca.person_id")
    .select(["ca.person_id", "p.name", "p.email", "ca.created_at"])
    .where("ca.commerce_id", "=", commerceId)
    .execute();
};
