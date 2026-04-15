import { db } from "../../../infra/database/connect";
import { NewPerson } from "../../../infra/database/types";
import cache from "../../../infra/database/cache";

export const createNewUser = async (user: NewPerson) => {
  return db
    .insertInto("person")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const getUserByEmail = async (email: string) => {
  return db
    .selectFrom("person")
    .selectAll()
    .where("email", "=", email)
    .executeTakeFirst();
};

export const findUserById = async (id: string) => {
  return (await cache).wrap(`user:${id}`, () =>
    db.selectFrom("person").selectAll().where("id", "=", id).executeTakeFirst()
  );
};

export const updateUserById = async (
  id: string,
  data: Record<string, unknown>
) => {
  const result = await db
    .updateTable("person")
    .set(data)
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
  await (await cache).del(`user:${id}`);
  return result;
};

export const softDeleteUserById = async (id: string) => {
  const result = await db
    .updateTable("person")
    .set({ active: false })
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
  await (await cache).del(`user:${id}`);
  return result;
};
