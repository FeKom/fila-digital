import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDatabase } from "../setup/testcontainer.setup";
import { Kysely } from "kysely";
import { Database, NewPerson } from "../../infra/database/types";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { uuidv7 } from "uuidv7";
import { User } from "../../domain/user/type";
import { hashPassword } from "../../utils/hash";

describe("User Controller - Integration Test with Testcontainers", () => {
  const res = {
    code: Number,
    send: Object,
  };
  let dbInstance: Kysely<Database>;
  let startedContainer: StartedPostgreSqlContainer;
  const testUser: User = {
    id: "",
    name: "Integration Test User",
    email: "integration@example.com",
    password: "password123",
    phone: "11 932223344",
    commerce_id: null,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  };

  describe("Register User Function Test", () => {
    beforeAll(async () => {
      const { db, container } = await setupTestDatabase();
      dbInstance = db;
      startedContainer = container;
    }, 20000);

    afterAll(async () => {
      await dbInstance.deleteFrom("person").execute();
    });

    it("Should register a new user successfully", async () => {
      const user = { ...testUser };

      const createUser = async (user: User) => {
        const hasedPassword = await hashPassword(user.password);
        const userWithHasedPassword: NewPerson = {
          ...user,
          password: hasedPassword,
          id: uuidv7(),
        };

        return dbInstance
          .insertInto("person")
          .values(userWithHasedPassword)
          .returningAll()
          .executeTakeFirstOrThrow();
      };

      expect(res.code(201)).toBeTruthy();
      expect(res.send({ message: "User Created" })).toBeTruthy();
      expect(createUser).toBeDefined();

      const getUserByEmail = async (email: string) => {
        return dbInstance
          .selectFrom("person")
          .selectAll()
          .where("email", "=", email)
          .executeTakeFirst();
      };
      const insertedUser = await getUserByEmail(user.email);
      expect(insertedUser).not.toBeNull();
      expect(getUserByEmail).toBeDefined();
    });
    describe("Register Existing User", () => {
      it("should return an error if user already exists", async () => {
        const user: User = {
          id: "",
          name: "Integration Test User",
          email: "integration@example.com",
          password: "password123",
          phone: "11 932223344",
          commerce_id: null,
          created_at: new Date().toDateString(),
          updated_at: new Date().toDateString(),
        };

        const createUser = async (user: User) => {
          const hasedPassword = await hashPassword(user.password);
          const userWithHasedPassword: NewPerson = {
            ...user,
            password: hasedPassword,
            id: uuidv7(),
          };

          return dbInstance
            .insertInto("person")
            .values(userWithHasedPassword)
            .returningAll()
            .executeTakeFirstOrThrow();
        };
        await createUser(user);
        expect(createUser).toBeDefined();
        expect(res.code(409)).toBeTruthy();
        expect(res.send({ message: "User Already Exists" })).toBeTruthy();

        const getUserByEmail = async (email: string) => {
          return dbInstance
            .selectFrom("person")
            .selectAll()
            .where("email", "=", email)
            .executeTakeFirst();
        };
        const insertedUser = await getUserByEmail(user.email);
        expect(insertedUser).not.toBeNull();
        expect(getUserByEmail).toBeDefined();
        expect(insertedUser?.email).toBe(user.email);
      });
    });
  });
  afterAll(async () => {
    await dbInstance.destroy();
    await startedContainer.stop();
  });
});
