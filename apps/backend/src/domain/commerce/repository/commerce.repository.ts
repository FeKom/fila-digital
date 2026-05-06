import { db } from "../../../infra/database/connect";
import { NewCommerce, Database } from "../../../infra/database/types";
import { NearbyCommerce } from "../type";
import { Kysely, sql } from "kysely";
import {
  buildPage,
  DEFAULT_PAGE_LIMIT,
  PaginationParams,
} from "../../../utils/pagination";

export const createCommerce = async (commerce: NewCommerce) => {
  return db
    .insertInto("commerce")
    .values(commerce)
    .returningAll()
    .executeTakeFirst();
};

export const getCommerceByDocumentId = async (document_id: string) => {
  return db
    .selectFrom("commerce")
    .selectAll()
    .where("document_id", "=", document_id)
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

export const findCommerceById = async (id: string) => {
  return db
    .selectFrom("commerce")
    .selectAll()
    .where("id", "=", id)
    .limit(1)
    .executeTakeFirstOrThrow();
};

export const updateCommerceByDocumentId = async (
  document_id: string,
  data: Record<string, unknown>
) => {
  return db
    .updateTable("commerce")
    .set(data)
    .where("document_id", "=", document_id)
    .executeTakeFirstOrThrow();
};

export const updateCommerceById = async (
  id: string,
  data: Record<string, unknown>
) => {
  return db
    .updateTable("commerce")
    .set(data)
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
};

export const findCommerceIdByUserId = async (id: string) => {
  return db
    .selectFrom("commerce")
    .selectAll()
    .where("owner_id", "=", id)
    .execute();
};

export const findCommerceOwnerByUserId = async (id: string) => {
  return db
    .selectFrom("commerce")
    .selectAll()
    .where("owner_id", "=", id)
    .limit(1)
    .executeTakeFirstOrThrow();
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
    .select([
      "c.id",
      "c.name",
      "c.description",
      "a.latitude",
      "a.longitude",
      sql<number>`COUNT(q.id)`.as("open_queues_count"),
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
    .groupBy(["c.id", "a.latitude", "a.longitude"])
    .orderBy("distance_meters", "asc")
    .limit(50)
    .execute() as Promise<NearbyCommerce[]>;
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
    .select([
      "c.id",
      "c.name",
      "c.description",
      "a.latitude",
      "a.longitude",
      sql<number>`COUNT(q.id)`.as("open_queues_count"),
    ])
    .where("c.active", "=", true)
    .where("a.cep", "is not", null)
    .where(sql<boolean>`replace(a.cep, '-', '') LIKE ${cepPrefix + "%"}`)
    .groupBy(["c.id", "a.latitude", "a.longitude"])
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
