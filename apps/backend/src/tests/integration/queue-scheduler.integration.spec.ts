import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDatabase } from "../setup/testcontainer.setup";
import { Kysely } from "kysely";
import { Database } from "../../infra/database/types";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { uuidv7 } from "uuidv7";
import {
  closeExpiredQueues,
  openScheduledQueues,
  deactivateFiredOnceSchedules,
} from "../../domain/queue/repository/queue.repository";

// ── helpers ────────────────────────────────────────────────────────────────

async function seedOwner(db: Kysely<Database>): Promise<string> {
  const id = uuidv7();
  await db
    .insertInto("person")
    .values({
      id,
      name: "Test Owner",
      email: `owner-sched-${id}@test.com`,
      password: "hashed",
      phone: "11999999999",
      role: "OWNER",
    })
    .execute();
  return id;
}

async function seedCommerce(
  db: Kysely<Database>,
  ownerId: string,
  opts: { openAt?: string; closedAt?: string } = {}
): Promise<string> {
  const id = uuidv7();
  await db
    .insertInto("commerce")
    .values({
      id,
      name: "Test Commerce",
      owner_id: ownerId,
      document_id: `doc-${id}`,
      open_at: opts.openAt,
      closed_at: opts.closedAt,
      active: true,
    })
    .execute();
  return id;
}

async function seedQueue(
  db: Kysely<Database>,
  commerceId: string,
  status: "open" | "closed"
): Promise<string> {
  const id = uuidv7();
  await db
    .insertInto("queue")
    .values({
      id,
      commerce_id: commerceId,
      name: "Test Queue",
      type: "permanent",
      status,
      qrcode_token: uuidv7(),
      active: true,
    })
    .execute();
  return id;
}

async function seedSchedule(
  db: Kysely<Database>,
  queueId: string,
  commerceId: string,
  opts: {
    type: "once" | "daily";
    scheduledAt?: string;
    status?: "active" | "inactive";
  }
): Promise<string> {
  const id = uuidv7();
  await db
    .insertInto("queue_schedules")
    .values({
      id,
      queue_id: queueId,
      commerce_id: commerceId,
      type: opts.type,
      scheduled_at: opts.scheduledAt,
      status: opts.status ?? "active",
    })
    .execute();
  return id;
}

async function getQueueStatus(
  db: Kysely<Database>,
  queueId: string
): Promise<"open" | "closed"> {
  const row = await db
    .selectFrom("queue")
    .select("status")
    .where("id", "=", queueId)
    .executeTakeFirstOrThrow();
  return row.status;
}

async function getScheduleStatus(
  db: Kysely<Database>,
  scheduleId: string
): Promise<"active" | "inactive"> {
  const row = await db
    .selectFrom("queue_schedules")
    .select("status")
    .where("id", "=", scheduleId)
    .executeTakeFirstOrThrow();
  return row.status;
}

// ── suite ──────────────────────────────────────────────────────────────────

describe("Queue Scheduler - Integration", () => {
  let dbInstance: Kysely<Database>;
  let startedContainer: StartedPostgreSqlContainer;
  let ownerId: string;

  beforeAll(async () => {
    const { db, container } = await setupTestDatabase();
    dbInstance = db;
    startedContainer = container;
    ownerId = await seedOwner(dbInstance);
  }, 120000);

  afterAll(async () => {
    await dbInstance.deleteFrom("queue_schedules").execute();
    await dbInstance.deleteFrom("queue").execute();
    await dbInstance.deleteFrom("commerce").execute();
    await dbInstance.deleteFrom("person").where("id", "=", ownerId).execute();
    await dbInstance.destroy();
    await startedContainer.stop();
  });

  // ── closeExpiredQueues ───────────────────────────────────────────────────

  describe("closeExpiredQueues", () => {
    it("closes an open queue whose commerce closed_at is in the past (SP time)", async () => {
      // closed_at = 00:01 — always past by the time the test runs
      const commerceId = await seedCommerce(dbInstance, ownerId, {
        closedAt: "00:01",
      });
      const queueId = await seedQueue(dbInstance, commerceId, "open");

      const count = await closeExpiredQueues(dbInstance);

      expect(count).toBeGreaterThanOrEqual(1);
      expect(await getQueueStatus(dbInstance, queueId)).toBe("closed");
    });

    it("does not close a queue whose commerce closed_at is in the future", async () => {
      // closed_at = 23:59 — never past during normal test runs
      const commerceId = await seedCommerce(dbInstance, ownerId, {
        closedAt: "23:59",
      });
      const queueId = await seedQueue(dbInstance, commerceId, "open");

      await closeExpiredQueues(dbInstance);

      expect(await getQueueStatus(dbInstance, queueId)).toBe("open");
    });

    it("does not touch already-closed queues", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId, {
        closedAt: "00:01",
      });
      const queueId = await seedQueue(dbInstance, commerceId, "closed");

      await closeExpiredQueues(dbInstance);

      expect(await getQueueStatus(dbInstance, queueId)).toBe("closed");
    });

    it("does not close queues whose commerce has no closed_at", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId);
      const queueId = await seedQueue(dbInstance, commerceId, "open");

      await closeExpiredQueues(dbInstance);

      expect(await getQueueStatus(dbInstance, queueId)).toBe("open");
    });
  });

  // ── openScheduledQueues + deactivateFiredOnceSchedules ──────────────────

  describe("openScheduledQueues", () => {
    it("opens a closed queue with an active once-schedule whose time has passed", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId);
      const queueId = await seedQueue(dbInstance, commerceId, "closed");
      // scheduled_at 1 hour ago
      const scheduledAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await seedSchedule(dbInstance, queueId, commerceId, {
        type: "once",
        scheduledAt,
      });

      const count = await openScheduledQueues(dbInstance);

      expect(count).toBeGreaterThanOrEqual(1);
      expect(await getQueueStatus(dbInstance, queueId)).toBe("open");
    });

    it("does not open a queue with an active once-schedule set in the future", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId);
      const queueId = await seedQueue(dbInstance, commerceId, "closed");
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await seedSchedule(dbInstance, queueId, commerceId, {
        type: "once",
        scheduledAt,
      });

      await openScheduledQueues(dbInstance);

      expect(await getQueueStatus(dbInstance, queueId)).toBe("closed");
    });

    it("does not open a queue with an inactive once-schedule", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId);
      const queueId = await seedQueue(dbInstance, commerceId, "closed");
      const scheduledAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await seedSchedule(dbInstance, queueId, commerceId, {
        type: "once",
        scheduledAt,
        status: "inactive",
      });

      await openScheduledQueues(dbInstance);

      expect(await getQueueStatus(dbInstance, queueId)).toBe("closed");
    });
  });

  describe("deactivateFiredOnceSchedules", () => {
    it("deactivates an active once-schedule whose time has passed", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId);
      const queueId = await seedQueue(dbInstance, commerceId, "closed");
      const scheduledAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const scheduleId = await seedSchedule(dbInstance, queueId, commerceId, {
        type: "once",
        scheduledAt,
      });

      await deactivateFiredOnceSchedules(dbInstance);

      expect(await getScheduleStatus(dbInstance, scheduleId)).toBe("inactive");
    });

    it("leaves a future once-schedule active", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId);
      const queueId = await seedQueue(dbInstance, commerceId, "closed");
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const scheduleId = await seedSchedule(dbInstance, queueId, commerceId, {
        type: "once",
        scheduledAt,
      });

      await deactivateFiredOnceSchedules(dbInstance);

      expect(await getScheduleStatus(dbInstance, scheduleId)).toBe("active");
    });

    it("never touches daily schedules", async () => {
      const commerceId = await seedCommerce(dbInstance, ownerId);
      const queueId = await seedQueue(dbInstance, commerceId, "closed");
      const scheduleId = await seedSchedule(dbInstance, queueId, commerceId, {
        type: "daily",
      });

      await deactivateFiredOnceSchedules(dbInstance);

      expect(await getScheduleStatus(dbInstance, scheduleId)).toBe("active");
    });
  });
});
