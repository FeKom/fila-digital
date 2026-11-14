import { db } from "../../../infra/database/connect";
import { NewPerson, Person, PersonUpdate } from "../../../infra/database/types";
import cache from "../../../infra/database/cache";

export const createNewUser = async (user: NewPerson) => {
  return db
    .insertInto("person")
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow(() => new Error("Failed to create user"));
};

// Login only. Deliberately ignores `active`: the controller checks it after
// the password, so a disabled account is only revealed to its owner.
export const findCredentialsByEmail = async (
  email: string
): Promise<
  | Pick<Person, "id" | "name" | "email" | "role" | "password" | "active">
  | undefined
> => {
  return db
    .selectFrom("person")
    .select(["id", "name", "email", "role", "password", "active"])
    .where("email", "=", email)
    .executeTakeFirst();
};

// Counts disabled accounts too: their email stays taken until reactivation
// is designed.
export const emailExists = async (email: string): Promise<boolean> => {
  const row = await db
    .selectFrom("person")
    .select("id")
    .where("email", "=", email)
    .executeTakeFirst();
  return row !== undefined;
};

export const getUserByEmail = async (
  email: string
): Promise<Pick<Person, "id" | "name" | "email"> | undefined> => {
  return db
    .selectFrom("person")
    .select(["id", "name", "email"])
    .where("email", "=", email)
    .where("active", "=", true)
    .executeTakeFirst();
};

export const findUserById = async (id: string) => {
  return (await cache).wrap(`user:${id}`, () =>
    db.selectFrom("person").selectAll().where("id", "=", id).executeTakeFirst()
  );
};

export const updateUserById = async (
  id: string,
  data: Pick<PersonUpdate, "name" | "phone">
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
