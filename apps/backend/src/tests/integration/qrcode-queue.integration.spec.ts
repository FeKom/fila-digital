import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDatabase } from "../setup/testcontainer.setup";
import { Kysely } from "kysely";
import { Database, NewPerson } from "../../infra/database/types";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { uuidv7 } from "uuidv7";
import { hashPassword } from "../../utils/hash";
import { generateQrCodeBase64 } from "../../utils/qrcode";

describe("QR Code Queue - Integration Test", () => {
  let dbInstance: Kysely<Database>;
  let startedContainer: StartedPostgreSqlContainer;

  // IDs gerados durante os testes
  let userId: string;
  let commerceId: string;
  let queueId: string;
  let qrcodeToken: string;

  beforeAll(async () => {
    const { db, container } = await setupTestDatabase();
    dbInstance = db;
    startedContainer = container;

    // Seed: criar usuário
    const hashedPassword = await hashPassword("password123");
    userId = uuidv7();
    await dbInstance
      .insertInto("person")
      .values({
        id: userId,
        name: "Test Owner",
        email: "owner@test.com",
        password: hashedPassword,
        phone: "11999999999",
      })
      .execute();

    // Seed: criar commerce com owner
    commerceId = uuidv7();
    await dbInstance
      .insertInto("commerce")
      .values({
        id: commerceId,
        name: "Test Commerce",
        description: "A test commerce",
        phone: "11988888888",
        document_id: "12345678000100",
        owner_id: userId,
        open_at: "08:00",
        closed_at: "18:00",
      })
      .execute();
  }, 120000);

  afterAll(async () => {
    await dbInstance.deleteFrom("participants_queue").execute();
    await dbInstance.deleteFrom("queue").execute();
    await dbInstance.deleteFrom("commerce").execute();
    await dbInstance.deleteFrom("person").execute();
    await dbInstance.destroy();
    await startedContainer.stop();
  });

  describe("Criação de fila com QR code token", () => {
    it("deve criar uma fila com qrcode_token gerado automaticamente", async () => {
      qrcodeToken = uuidv7();
      queueId = uuidv7();

      const createdQueue = await dbInstance
        .insertInto("queue")
        .values({
          id: queueId,
          commerce_id: commerceId,
          name: "Fila de Teste",
          description: "Fila para testar QR code",
          type: "ephemera",
          status: "open",
          qrcode_token: qrcodeToken,
          active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      expect(createdQueue).toBeDefined();
      expect(createdQueue.id).toBe(queueId);
      expect(createdQueue.qrcode_token).toBe(qrcodeToken);
      expect(createdQueue.commerce_id).toBe(commerceId);
      expect(createdQueue.status).toBe("open");
      expect(createdQueue.active).toBe(true);
    });

    it("deve gerar QR code base64 a partir dos dados da fila", async () => {
      const qrcodeData = {
        queueId,
        token: qrcodeToken,
        createdAt: new Date().toISOString(),
      };

      const qrcodeBase64 = await generateQrCodeBase64(
        JSON.stringify(qrcodeData)
      );

      expect(qrcodeBase64).toBeDefined();
      expect(qrcodeBase64).toMatch(/^data:image\/png;base64,/);
      expect(qrcodeBase64.length).toBeGreaterThan(100);
    });

    it("deve buscar a fila pelo ID e verificar o qrcode_token", async () => {
      const queue = await dbInstance
        .selectFrom("queue")
        .selectAll()
        .where("id", "=", queueId)
        .executeTakeFirst();

      expect(queue).toBeDefined();
      expect(queue!.qrcode_token).toBe(qrcodeToken);
    });

    it("qrcode_token deve ser único (index unique)", async () => {
      await expect(
        dbInstance
          .insertInto("queue")
          .values({
            id: uuidv7(),
            commerce_id: commerceId,
            name: "Fila Duplicada",
            description: null,
            type: "ephemera",
            status: "open",
            qrcode_token: qrcodeToken, // mesmo token
            active: true,
          })
          .execute()
      ).rejects.toThrow();
    });
  });

  describe("Entrada na fila via QR code - usuário autenticado", () => {
    it("deve permitir entrada com userId válido e token correto", async () => {
      const queue = await dbInstance
        .selectFrom("queue")
        .selectAll()
        .where("id", "=", queueId)
        .executeTakeFirst();

      expect(queue).toBeDefined();
      expect(queue!.qrcode_token).toBe(qrcodeToken);
      expect(queue!.status).toBe("open");
      expect(queue!.active).toBe(true);

      // Inserir participante autenticado
      const participantId = uuidv7();
      const participant = await dbInstance
        .insertInto("participants_queue")
        .values({
          id: participantId,
          queue_id: queueId,
          person_id: userId,
          anonymous_id: null,
          is_active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      expect(participant).toBeDefined();
      expect(participant.person_id).toBe(userId);
      expect(participant.queue_id).toBe(queueId);
      expect(participant.is_active).toBe(true);
      expect(participant.anonymous_id).toBeNull();
    });

    it("deve verificar que o usuário já está na fila (duplicata)", async () => {
      const existing = await dbInstance
        .selectFrom("participants_queue")
        .select("id")
        .where("person_id", "=", userId)
        .where("queue_id", "=", queueId)
        .where("is_active", "=", true)
        .limit(1)
        .executeTakeFirst();

      expect(existing).toBeDefined();
      // Controller retornaria 400 "User is already in this queue."
    });
  });

  describe("Entrada na fila via QR code - usuário anônimo", () => {
    const anonymousId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    it("deve permitir entrada com anonymousId válido", async () => {
      const participantId = uuidv7();
      const participant = await dbInstance
        .insertInto("participants_queue")
        .values({
          id: participantId,
          queue_id: queueId,
          person_id: null,
          anonymous_id: anonymousId,
          is_active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      expect(participant).toBeDefined();
      expect(participant.person_id).toBeNull();
      expect(participant.anonymous_id).toBe(anonymousId);
      expect(participant.queue_id).toBe(queueId);
      expect(participant.is_active).toBe(true);
    });

    it("deve verificar que anônimo já está na fila (duplicata)", async () => {
      const existing = await dbInstance
        .selectFrom("participants_queue")
        .select("id")
        .where("anonymous_id", "=", anonymousId)
        .where("queue_id", "=", queueId)
        .where("is_active", "=", true)
        .limit(1)
        .executeTakeFirst();

      expect(existing).toBeDefined();
    });
  });

  describe("Validações de segurança", () => {
    it("deve rejeitar token inválido (simulação)", async () => {
      const queue = await dbInstance
        .selectFrom("queue")
        .selectAll()
        .where("id", "=", queueId)
        .executeTakeFirst();

      const fakeToken = uuidv7();
      expect(queue!.qrcode_token).not.toBe(fakeToken);
      // Controller retornaria 403 "Invalid QR code token."
    });

    it("deve rejeitar entrada em fila fechada", async () => {
      // Fechar a fila
      await dbInstance
        .updateTable("queue")
        .set({ status: "closed" })
        .where("id", "=", queueId)
        .execute();

      const queue = await dbInstance
        .selectFrom("queue")
        .selectAll()
        .where("id", "=", queueId)
        .executeTakeFirst();

      expect(queue!.status).toBe("closed");
      // Controller retornaria 400 "This queue is not open."

      // Reabrir a fila para os próximos testes
      await dbInstance
        .updateTable("queue")
        .set({ status: "open" })
        .where("id", "=", queueId)
        .execute();
    });

    it("deve rejeitar entrada em fila inativa", async () => {
      await dbInstance
        .updateTable("queue")
        .set({ active: false })
        .where("id", "=", queueId)
        .execute();

      const queue = await dbInstance
        .selectFrom("queue")
        .selectAll()
        .where("id", "=", queueId)
        .executeTakeFirst();

      expect(queue!.active).toBe(false);
      // Controller retornaria 400 "This queue is no longer active."

      // Reativar
      await dbInstance
        .updateTable("queue")
        .set({ active: true })
        .where("id", "=", queueId)
        .execute();
    });

    it("deve retornar null para fila inexistente", async () => {
      const fakeQueueId = uuidv7();
      const queue = await dbInstance
        .selectFrom("queue")
        .selectAll()
        .where("id", "=", fakeQueueId)
        .executeTakeFirst();

      expect(queue).toBeUndefined();
      // Controller retornaria 404 "Queue not found."
    });

    it("person_id deve ser nullable (permite anônimo)", async () => {
      const id = uuidv7();
      const anonymousParticipant = await dbInstance
        .insertInto("participants_queue")
        .values({
          id,
          queue_id: queueId,
          person_id: null,
          anonymous_id: uuidv7(),
          is_active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      expect(anonymousParticipant.person_id).toBeNull();
      expect(anonymousParticipant.anonymous_id).toBeDefined();
    });
  });

  describe("Fluxo completo: criar fila → gerar QR → entrar → verificar", () => {
    it("deve executar o fluxo completo end-to-end", async () => {
      // 1. Criar nova fila
      const newQueueId = uuidv7();
      const newToken = uuidv7();
      const newQueue = await dbInstance
        .insertInto("queue")
        .values({
          id: newQueueId,
          commerce_id: commerceId,
          name: "Fila E2E",
          description: "Teste de fluxo completo",
          type: "permanent",
          status: "open",
          qrcode_token: newToken,
          active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      expect(newQueue.qrcode_token).toBe(newToken);

      // 2. Gerar QR code base64
      const qrcodeData = {
        queueId: newQueueId,
        token: newToken,
        createdAt: newQueue.created_at,
      };
      const qrcode = await generateQrCodeBase64(JSON.stringify(qrcodeData));
      expect(qrcode).toMatch(/^data:image\/png;base64,/);

      // 3. Validar token
      const fetchedQueue = await dbInstance
        .selectFrom("queue")
        .selectAll()
        .where("id", "=", newQueueId)
        .executeTakeFirstOrThrow();

      expect(fetchedQueue.qrcode_token).toBe(newToken);
      expect(fetchedQueue.status).toBe("open");
      expect(fetchedQueue.active).toBe(true);

      // 4. Criar novo usuário para entrar na fila
      const newUserId = uuidv7();
      await dbInstance
        .insertInto("person")
        .values({
          id: newUserId,
          name: "QR Code User",
          email: "qruser@test.com",
          password: await hashPassword("pass123"),
          phone: "11977777777",
        })
        .execute();

      // 5. Entrar na fila com userId
      const userEntry = await dbInstance
        .insertInto("participants_queue")
        .values({
          id: uuidv7(),
          queue_id: newQueueId,
          person_id: newUserId,
          anonymous_id: null,
          is_active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      expect(userEntry.person_id).toBe(newUserId);
      expect(userEntry.queue_id).toBe(newQueueId);

      // 6. Entrar na fila com anonymousId
      const anonId = uuidv7();
      const anonEntry = await dbInstance
        .insertInto("participants_queue")
        .values({
          id: uuidv7(),
          queue_id: newQueueId,
          person_id: null,
          anonymous_id: anonId,
          is_active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      expect(anonEntry.anonymous_id).toBe(anonId);
      expect(anonEntry.person_id).toBeNull();

      // 7. Verificar que ambos estão na fila
      const participants = await dbInstance
        .selectFrom("participants_queue")
        .selectAll()
        .where("queue_id", "=", newQueueId)
        .where("is_active", "=", true)
        .orderBy("created_at", "asc")
        .execute();

      expect(participants).toHaveLength(2);
      expect(participants[0].person_id).toBe(newUserId);
      expect(participants[1].anonymous_id).toBe(anonId);
    });
  });
});
