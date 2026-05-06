import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDatabase } from "../setup/testcontainer.setup";
import { Kysely } from "kysely";
import { Database } from "../../infra/database/types";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { uuidv7 } from "uuidv7";
import { findNearbyOpenQueues } from "../../domain/commerce/repository/commerce.repository";

// São Paulo city center used as reference point in all tests
const SAO_PAULO = { lat: -23.5505, lng: -46.6333 };

// ~200m north of reference — well within 5 km radius
const NEARBY = { lat: -23.5487, lng: -46.6333 };

// ~110 km north of reference — far outside 5 km radius
const FAR_AWAY = { lat: -22.5487, lng: -46.6333 };

/** Insert commerce + address row together */
async function seedCommerce(
  db: Kysely<Database>,
  opts: {
    id: string;
    name: string;
    ownerId: string;
    docHash: string;
    lat: number;
    lng: number;
    active?: boolean;
  }
) {
  await db
    .insertInto("commerce")
    .values({
      id: opts.id,
      name: opts.name,
      owner_id: opts.ownerId,
      document_id: opts.docHash,
      active: opts.active ?? true,
    })
    .execute();

  await db
    .insertInto("address")
    .values({
      id: uuidv7(),
      commerce_id: opts.id,
      latitude: opts.lat,
      longitude: opts.lng,
    })
    .execute();
}

describe("Nearby Queues - Integration", () => {
  let dbInstance: Kysely<Database>;
  let startedContainer: StartedPostgreSqlContainer;

  let ownerId: string;
  let nearCommerceId: string;
  let farCommerceId: string;

  beforeAll(async () => {
    const { db, container } = await setupTestDatabase();
    dbInstance = db;
    startedContainer = container;

    // Seed owner
    ownerId = uuidv7();
    await dbInstance
      .insertInto("person")
      .values({
        id: ownerId,
        name: "Owner",
        email: `owner-nearby-${ownerId}@test.com`,
        password: "hashed",
        phone: "11999999999",
        role: "OWNER",
      })
      .execute();

    // Seed nearby commerce (within radius)
    nearCommerceId = uuidv7();
    await seedCommerce(dbInstance, {
      id: nearCommerceId,
      name: "Near Shop",
      ownerId,
      docHash: `hash-near-${nearCommerceId}`,
      lat: NEARBY.lat,
      lng: NEARBY.lng,
    });

    // Open queue for nearby commerce
    await dbInstance
      .insertInto("queue")
      .values({
        id: uuidv7(),
        commerce_id: nearCommerceId,
        name: "Main Queue",
        type: "permanent",
        status: "open",
        qrcode_token: `token-near-${nearCommerceId}`,
        active: true,
      })
      .execute();

    // Seed far commerce (outside radius)
    farCommerceId = uuidv7();
    await seedCommerce(dbInstance, {
      id: farCommerceId,
      name: "Far Shop",
      ownerId,
      docHash: `hash-far-${farCommerceId}`,
      lat: FAR_AWAY.lat,
      lng: FAR_AWAY.lng,
    });

    // Open queue for far commerce
    await dbInstance
      .insertInto("queue")
      .values({
        id: uuidv7(),
        commerce_id: farCommerceId,
        name: "Main Queue",
        type: "permanent",
        status: "open",
        qrcode_token: `token-far-${farCommerceId}`,
        active: true,
      })
      .execute();
  }, 120000);

  afterAll(async () => {
    await dbInstance.deleteFrom("queue").execute();
    await dbInstance.deleteFrom("address").execute();
    await dbInstance.deleteFrom("commerce").execute();
    await dbInstance.deleteFrom("person").where("id", "=", ownerId).execute();
    await dbInstance.destroy();
    await startedContainer.stop();
  });

  it("returns only commerces within the given radius", async () => {
    const results = await findNearbyOpenQueues(
      SAO_PAULO.lat,
      SAO_PAULO.lng,
      5000,
      dbInstance
    );

    const ids = results.map((r) => r.id);
    expect(ids).toContain(nearCommerceId);
    expect(ids).not.toContain(farCommerceId);
  });

  it("returns results sorted by distance ascending", async () => {
    const secondNearId = uuidv7();
    await seedCommerce(dbInstance, {
      id: secondNearId,
      name: "Second Near Shop",
      ownerId,
      docHash: `hash-second-${secondNearId}`,
      lat: -23.545, // ~600m from reference
      lng: -46.6333,
    });

    await dbInstance
      .insertInto("queue")
      .values({
        id: uuidv7(),
        commerce_id: secondNearId,
        name: "Queue",
        type: "permanent",
        status: "open",
        qrcode_token: `token-second-${secondNearId}`,
        active: true,
      })
      .execute();

    const results = await findNearbyOpenQueues(
      SAO_PAULO.lat,
      SAO_PAULO.lng,
      5000,
      dbInstance
    );

    const nearIdx = results.findIndex((r) => r.id === nearCommerceId);
    const secondIdx = results.findIndex((r) => r.id === secondNearId);

    expect(nearIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeGreaterThanOrEqual(0);
    // NEARBY (~200m) should appear before secondNear (~600m)
    expect(nearIdx).toBeLessThan(secondIdx);

    // cleanup
    await dbInstance
      .deleteFrom("queue")
      .where("commerce_id", "=", secondNearId)
      .execute();
    await dbInstance
      .deleteFrom("address")
      .where("commerce_id", "=", secondNearId)
      .execute();
    await dbInstance
      .deleteFrom("commerce")
      .where("id", "=", secondNearId)
      .execute();
  });

  it("excludes commerces with no open queues", async () => {
    const closedCommerceId = uuidv7();
    await seedCommerce(dbInstance, {
      id: closedCommerceId,
      name: "Closed Queue Shop",
      ownerId,
      docHash: `hash-closed-${closedCommerceId}`,
      lat: NEARBY.lat,
      lng: NEARBY.lng,
    });

    await dbInstance
      .insertInto("queue")
      .values({
        id: uuidv7(),
        commerce_id: closedCommerceId,
        name: "Closed Queue",
        type: "permanent",
        status: "closed",
        qrcode_token: `token-closed-${closedCommerceId}`,
        active: true,
      })
      .execute();

    const results = await findNearbyOpenQueues(
      SAO_PAULO.lat,
      SAO_PAULO.lng,
      5000,
      dbInstance
    );

    expect(results.map((r) => r.id)).not.toContain(closedCommerceId);

    // cleanup
    await dbInstance
      .deleteFrom("queue")
      .where("commerce_id", "=", closedCommerceId)
      .execute();
    await dbInstance
      .deleteFrom("address")
      .where("commerce_id", "=", closedCommerceId)
      .execute();
    await dbInstance
      .deleteFrom("commerce")
      .where("id", "=", closedCommerceId)
      .execute();
  });

  it("excludes inactive commerces", async () => {
    const inactiveCommerceId = uuidv7();
    await seedCommerce(dbInstance, {
      id: inactiveCommerceId,
      name: "Inactive Shop",
      ownerId,
      docHash: `hash-inactive-${inactiveCommerceId}`,
      lat: NEARBY.lat,
      lng: NEARBY.lng,
      active: false,
    });

    await dbInstance
      .insertInto("queue")
      .values({
        id: uuidv7(),
        commerce_id: inactiveCommerceId,
        name: "Queue",
        type: "permanent",
        status: "open",
        qrcode_token: `token-inactive-${inactiveCommerceId}`,
        active: true,
      })
      .execute();

    const results = await findNearbyOpenQueues(
      SAO_PAULO.lat,
      SAO_PAULO.lng,
      5000,
      dbInstance
    );

    expect(results.map((r) => r.id)).not.toContain(inactiveCommerceId);

    // cleanup
    await dbInstance
      .deleteFrom("queue")
      .where("commerce_id", "=", inactiveCommerceId)
      .execute();
    await dbInstance
      .deleteFrom("address")
      .where("commerce_id", "=", inactiveCommerceId)
      .execute();
    await dbInstance
      .deleteFrom("commerce")
      .where("id", "=", inactiveCommerceId)
      .execute();
  });

  it("returns open_queues_count correctly", async () => {
    const multiQueueCommerceId = uuidv7();
    await seedCommerce(dbInstance, {
      id: multiQueueCommerceId,
      name: "Multi Queue Shop",
      ownerId,
      docHash: `hash-multi-${multiQueueCommerceId}`,
      lat: NEARBY.lat,
      lng: NEARBY.lng,
    });

    await dbInstance
      .insertInto("queue")
      .values([
        {
          id: uuidv7(),
          commerce_id: multiQueueCommerceId,
          name: "Queue A",
          type: "permanent",
          status: "open",
          qrcode_token: `token-multi-a-${multiQueueCommerceId}`,
          active: true,
        },
        {
          id: uuidv7(),
          commerce_id: multiQueueCommerceId,
          name: "Queue B",
          type: "permanent",
          status: "open",
          qrcode_token: `token-multi-b-${multiQueueCommerceId}`,
          active: true,
        },
      ])
      .execute();

    const results = await findNearbyOpenQueues(
      SAO_PAULO.lat,
      SAO_PAULO.lng,
      5000,
      dbInstance
    );

    const found = results.find((r) => r.id === multiQueueCommerceId);
    expect(found).toBeDefined();
    expect(Number(found!.open_queues_count)).toBe(2);

    // cleanup
    await dbInstance
      .deleteFrom("queue")
      .where("commerce_id", "=", multiQueueCommerceId)
      .execute();
    await dbInstance
      .deleteFrom("address")
      .where("commerce_id", "=", multiQueueCommerceId)
      .execute();
    await dbInstance
      .deleteFrom("commerce")
      .where("id", "=", multiQueueCommerceId)
      .execute();
  });
});
