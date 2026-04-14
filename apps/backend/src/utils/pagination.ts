/**
 * Cursor-based pagination utilities.
 *
 * How it works:
 *   1. The repository fetches `limit + 1` rows.
 *   2. If the result has more rows than `limit`, there is a next page.
 *   3. The cursor for the next page is the `created_at` ISO string of the
 *      last item in the *current* page (not the extra row).
 *   4. On the next request the caller passes that cursor, and the repository
 *      adds a `WHERE created_at > cursor` clause.
 *
 * Why created_at?
 *   All tables use UUIDv7 primary keys which are time-ordered, and every table
 *   has a `created_at` column. Using a timestamp as the cursor gives stable,
 *   gap-free pagination even when rows are inserted between pages.
 */

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PaginationParams = {
  /** ISO date string of the last item's `created_at` from the previous page. */
  cursor?: string;
  /** Number of items per page. Defaults to 20, capped at 100. */
  limit?: number;
};

export type PageResult<T> = {
  data: T[];
  /**
   * Pass this value as `cursor` in the next request to get the following page.
   * `null` means this is the last page — there are no more results.
   */
  nextCursor: string | null;
  hasMore: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses and validates `cursor` and `limit` from raw query-string params.
 * Invalid or missing values fall back to safe defaults.
 *
 * @example
 * const params = parsePaginationParams(req.query);
 * // { cursor: "2024-01-15T10:30:00.000Z", limit: 20 }
 */
export function parsePaginationParams(
  query: Record<string, unknown>
): PaginationParams {
  const rawLimit = Number(query.limit);
  const limit =
    !isNaN(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT;

  const cursor =
    typeof query.cursor === "string" && query.cursor.trim().length > 0
      ? query.cursor.trim()
      : undefined;

  return { cursor, limit };
}

/**
 * Slices the extra row used for `hasMore` detection and builds the page result.
 *
 * The repository must fetch `limit + 1` rows and pass them here.
 * `buildPage` slices the array back to `limit` items and uses the extra row
 * only to determine whether a next page exists — it is never included in the
 * response.
 *
 * @param rows       Raw rows from the database (at most `limit + 1` items).
 * @param cursorField The field whose value becomes the next cursor.
 *                   Must be a `Date` column (e.g. `"created_at"`).
 * @param limit      The page size requested by the caller.
 *
 * @example
 * const rows = await query.limit(limit + 1).execute();
 * return buildPage(rows, "created_at", limit);
 */
export function buildPage<T>(
  rows: T[],
  cursorField: keyof T,
  limit: number
): PageResult<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  const lastItem = data[data.length - 1];
  const cursorValue = lastItem != null ? lastItem[cursorField] : null;

  // Only Date values produce a cursor. Null / undefined values (nullable
  // columns) or unexpected types result in nextCursor = null, which signals
  // the last page even when hasMore is true. This is a safe fallback.
  const nextCursor =
    hasMore && cursorValue instanceof Date ? cursorValue.toISOString() : null;

  return { data, nextCursor, hasMore };
}
