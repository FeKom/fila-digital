import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDatabase } from "../setup/testcontainer.setup";
import { Kysely } from "kysely";
import { Database } from "../../infra/database/types";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { uuidv7 } from "uuidv7";
import { hashPassword } from "../../utils/hash";

describe("Soft Delete Commerce - Integration Test", () => {
  let dbInstance: Kysely<Database>;
  let startedContainer: StartedPostgreSqlContainer;

  let ownerId: string;
  let otherUserId: string;
  let commerceId: string;

  beforeAll(async () => {
    const { db, container } = await setupTestDatabase();
    dbInstance = db;
    startedContainer = container;

    // Seed: criar owner
    ownerId = uuidv7();
    await dbInstance
      .insertInto("person")
      .values({
        id: ownerId,
        name: "Commerce Owner",
        email: "owner@softdelete.com",
        password: await hashPassword("password123"),
        phone: "11999999999",
      })
      .execute();

    // Seed: criar outro usuário (não é owner)
    otherUserId = uuidv7();
    await dbInstance
      .insertInto("person")
      .values({
        id: otherUserId,
        name: "Other User",
        email: "other@softdelete.com",
        password: await hashPassword("password123"),
        phone: "11988888888",
      })
      .execute();

    // Seed: criar commerce
    commerceId = uuidv7();
    await dbInstance
      .insertInto("commerce")
      .values({
        id: commerceId,
        name: "Test Commerce",
        description: "Commerce for soft-delete test",
        phone: "11977777777",
        document_id: "11222333000181",
        owner_id: ownerId,
        open_at: "08:00",
        closed_at: "18:00",
      })
      .execute();
  }, 120000);

  afterAll(async () => {
    await dbInstance.deleteFrom("commerce").execute();
    await dbInstance.deleteFrom("person").execute();
    await dbInstance.destroy();
    await startedContainer.stop();
  });

  describe("Coluna active no commerce", () => {
    it("commerce deve ser criado com active = true por padrão", async () => {
      const commerce = await dbInstance
        .selectFrom("commerce")
        .selectAll()
        .where("id", "=", commerceId)
        .executeTakeFirst();

      expect(commerce).toBeDefined();
      expect(commerce!.active).toBe(true);
    });

    it("deve permitir setar active para false (soft-delete)", async () => {
      await dbInstance
        .updateTable("commerce")
        .set({ active: false })
        .where("id", "=", commerceId)
        .execute();

      const commerce = await dbInstance
        .selectFrom("commerce")
        .selectAll()
        .where("id", "=", commerceId)
        .executeTakeFirst();

      expect(commerce).toBeDefined();
      expect(commerce!.active).toBe(false);
    });

    it("deve permitir reativar commerce (setar active para true)", async () => {
      await dbInstance
        .updateTable("commerce")
        .set({ active: true })
        .where("id", "=", commerceId)
        .execute();

      const commerce = await dbInstance
        .selectFrom("commerce")
        .selectAll()
        .where("id", "=", commerceId)
        .executeTakeFirst();

      expect(commerce).toBeDefined();
      expect(commerce!.active).toBe(true);
    });
  });

  describe("Validações de soft-delete", () => {
    it("commerce inexistente deve retornar undefined", async () => {
      const fakeId = uuidv7();
      const commerce = await dbInstance
        .selectFrom("commerce")
        .selectAll()
        .where("id", "=", fakeId)
        .executeTakeFirst();

      expect(commerce).toBeUndefined();
    });

    it("deve validar que owner_id corresponde ao usuário", async () => {
      const commerce = await dbInstance
        .selectFrom("commerce")
        .selectAll()
        .where("id", "=", commerceId)
        .executeTakeFirst();

      expect(commerce).toBeDefined();
      expect(commerce!.owner_id).toBe(ownerId);
      expect(commerce!.owner_id).not.toBe(otherUserId);
    });

    it("soft-delete não deve remover o registro do banco", async () => {
      // Soft-delete
      await dbInstance
        .updateTable("commerce")
        .set({ active: false })
        .where("id", "=", commerceId)
        .execute();

      // O registro ainda existe
      const commerce = await dbInstance
        .selectFrom("commerce")
        .selectAll()
        .where("id", "=", commerceId)
        .executeTakeFirst();

      expect(commerce).toBeDefined();
      expect(commerce!.active).toBe(false);
      expect(commerce!.name).toBe("Test Commerce");

      // Reativar para os próximos testes
      await dbInstance
        .updateTable("commerce")
        .set({ active: true })
        .where("id", "=", commerceId)
        .execute();
    });
  });
});
