import { db } from "../../../infra/database/connect";
import {
  NewCommerce,
  Database,
  CommerceRow,
  commerceRowColumns,
} from "../../../infra/database/types";
import { Kysely, sql } from "kysely";
import {
  buildPage,
  DEFAULT_PAGE_LIMIT,
  PaginationParams,
} from "../../../utils/pagination";

// Raw row from the nearby queries: pg returns timestamps as Date and
// COUNT(*) as a string. The API contract lives in @fila-digital/types.
export type NearbyCommerce = {
  commerce_id: string;
  name: string;
  description: string | null;
  queue_id: string;
  created_at: Date;
  latitude: number | null;
  longitude: number | null;
  participants_waiting: string | number;
  distance_meters?: number | null;
};

export const createCommerce = async (commerce: NewCommerce) => {
  return db
    .insertInto("commerce")
    .values(commerce)
    .returningAll()
    .executeTakeFirst();
};

export const getCommerceByDocumentId = async (
  document_hash: string
): Promise<CommerceRow | undefined> => {
  return db
    .selectFrom("commerce")
    .select(commerceRowColumns)
    .where("document_id", "=", document_hash)
    .limit(1)
    .executeTakeFirst();
};

export const getCommerceById = async (id: string) => {
  return db
    .selectFrom("commerce")
    .selectAll()
    .where("id", "=", id)
    .limit(1)
    .executeTakeFirst();
};

export const updateCommerceByDocumentId = async (
  document_hash: string,
  data: Record<string, unknown>
) => {
  return db
    .updateTable("commerce")
    .set(data)
    .where("document_id", "=", document_hash)
    .executeTakeFirstOrThrow(
      () => new Error(`Could not update commerce ${document_hash}`)
    );
};

export const updateCommerceById = async (
  id: string,
  data: Record<string, unknown>
) => {
  return db
    .updateTable("commerce")
    .set(data)
    .where("id", "=", id)
    .executeTakeFirstOrThrow(
      () => new Error(`Could not update commerce ${id}`)
    );
};

export const listCommercesByUserId = async (
  id: string
): Promise<CommerceRow[]> => {
  return db
    .selectFrom("commerce")
    .select([
      "id",
      "name",
      "description",
      "phone",
      "open_at",
      "closed_at",
      "active",
    ])
    .where("owner_id", "=", id)
    .execute();
};

export const canManageCommerce = async (
  person_id: string,
  commerce_id: string
): Promise<boolean> => {
  const row = await db
    .selectFrom("commerce as c")
    .select("c.id")
    .where("c.id", "=", commerce_id)
    .where("c.active", "=", true)
    .where((eb) =>
      eb.or([
        eb("c.owner_id", "=", person_id),
        eb.exists(
          eb
            .selectFrom("commerce_admins as ca")
            .select("ca.id")
            .whereRef("ca.commerce_id", "=", "c.id")
            .where("ca.person_id", "=", person_id)
        ),
      ])
    )
    .executeTakeFirst();
  return row !== undefined;
};

export const countActiveCommercesByOwnerId = async (
  owner_id: string
): Promise<number> => {
  const result = await db
    .selectFrom("commerce")
    .select(db.fn.countAll<number>().as("count"))
    .where("owner_id", "=", owner_id)
    .where("active", "=", true)
    .executeTakeFirstOrThrow();
  return Number(result.count);
};

export const findNearbyOpenQueues = async (
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  dbInstance: Kysely<Database> = db
): Promise<NearbyCommerce[]> => {
  return dbInstance
    .selectFrom("commerce as c")
    .innerJoin("queue as q", (join) =>
      join
        .onRef("q.commerce_id", "=", "c.id")
        .on("q.status", "=", "open")
        .on("q.active", "=", true)
    )
    .innerJoin("address as a", "a.commerce_id", "c.id")
    .leftJoin("participants_queue as pq", (join) =>
      join.onRef("pq.queue_id", "=", "q.id").on("pq.is_active", "=", true)
    )
    .select([
      "c.id as commerce_id",
      "c.name",
      "c.description",
      "q.id as queue_id",
      "q.created_at",
      "a.latitude",
      "a.longitude",
      sql<number>`COUNT(pq.id)`.as("participants_waiting"),
      sql<number>`earth_distance(ll_to_earth(a.latitude, a.longitude), ll_to_earth(${lat}, ${lng}))`.as(
        "distance_meters"
      ),
    ])
    .where("c.active", "=", true)
    .where("a.latitude", "is not", null)
    .where("a.longitude", "is not", null)
    .where(
      sql<boolean>`earth_distance(ll_to_earth(a.latitude, a.longitude), ll_to_earth(${lat}, ${lng})) <= ${radiusMeters}`
    )
    .groupBy(["c.id", "q.id", "q.created_at", "a.latitude", "a.longitude"])
    .orderBy("distance_meters", "asc")
    .limit(50)
    .execute() as Promise<NearbyCommerce[]>;
};

export const searchOpenQueues = async ({
  cepPrefix,
  name,
}: {
  cepPrefix?: string;
  name?: string;
}): Promise<NearbyCommerce[]> => {
  let query = db
    .selectFrom("commerce as c")
    .innerJoin("queue as q", (join) =>
      join
        .onRef("q.commerce_id", "=", "c.id")
        .on("q.status", "=", "open")
        .on("q.active", "=", true)
    )
    .leftJoin("address as a", "a.commerce_id", "c.id")
    .leftJoin("participants_queue as pq", (join) =>
      join.onRef("pq.queue_id", "=", "q.id").on("pq.is_active", "=", true)
    )
    .select([
      "c.id as commerce_id",
      "c.name",
      "c.description",
      "q.id as queue_id",
      "q.created_at",
      "a.latitude",
      "a.longitude",
      sql<number>`COUNT(pq.id)`.as("participants_waiting"),
    ])
    .where("c.active", "=", true)
    .groupBy(["c.id", "q.id", "q.created_at", "a.latitude", "a.longitude"])
    .limit(50);

  if (cepPrefix) {
    query = query
      .where("a.cep", "is not", null)
      .where(sql<boolean>`replace(a.cep, '-', '') LIKE ${cepPrefix + "%"}`);
  }

  if (name) {
    query = query.where("c.name", "ilike", `%${name}%`);
  }

  return query.execute() as Promise<NearbyCommerce[]>;
};

export const findNearbyOpenQueuesByCepPrefix = async (
  cepPrefix: string
): Promise<NearbyCommerce[]> => {
  return db
    .selectFrom("commerce as c")
    .innerJoin("queue as q", (join) =>
      join
        .onRef("q.commerce_id", "=", "c.id")
        .on("q.status", "=", "open")
        .on("q.active", "=", true)
    )
    .innerJoin("address as a", "a.commerce_id", "c.id")
    .leftJoin("participants_queue as pq", (join) =>
      join.onRef("pq.queue_id", "=", "q.id").on("pq.is_active", "=", true)
    )
    .select([
      "c.id as commerce_id",
      "c.name",
      "c.description",
      "q.id as queue_id",
      "q.created_at",
      "a.latitude",
      "a.longitude",
      sql<number>`COUNT(pq.id)`.as("participants_waiting"),
    ])
    .where("c.active", "=", true)
    .where("a.cep", "is not", null)
    .where(sql<boolean>`replace(a.cep, '-', '') LIKE ${cepPrefix + "%"}`)
    .groupBy(["c.id", "q.id", "q.created_at", "a.latitude", "a.longitude"])
    .limit(50)
    .execute() as Promise<NearbyCommerce[]>;
};

export const listAllCommerces = async ({
  cursor,
  limit = DEFAULT_PAGE_LIMIT,
}: PaginationParams = {}) => {
  let query = db
    .selectFrom("commerce")
    .select([
      "commerce.id",
      "commerce.name",
      "commerce.description",
      "commerce.open_at",
      "commerce.closed_at",
      "commerce.created_at",
    ])
    .orderBy("commerce.created_at", "asc")
    .limit(limit + 1); // fetch one extra to detect hasMore

  if (cursor) {
    query = query.where("commerce.created_at", ">", new Date(cursor));
  }

  const rows = await query.execute();
  return buildPage(rows, "created_at", limit);
};
