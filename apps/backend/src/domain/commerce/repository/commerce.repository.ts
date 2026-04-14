import { db } from "../../../infra/database/connect";
import { NewCommerce } from "../../../infra/database/types";
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
