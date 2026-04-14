/**
 * Centralized cache key helpers.
 * All controllers must import from here — never hardcode key strings inline.
 * This prevents typos causing silent cache-miss/invalidation bugs.
 */
export const cacheKeys = {
  commerceDocument: (document_id: string) => `commerce:document:${document_id}`,
  commerceId: (id: string) => `commerce:id:${id}`,
  commerceOwner: (owner_id: string) => `commerce:owner:${owner_id}`,
  commerceList: () => "commerce:list:all",
  queueByCommerce: (commerce_id: string) => `queue:commerce:${commerce_id}`,
} as const;

/**
 * Per-entry TTLs in milliseconds.
 * Shorter TTL = fresher data but more DB hits.
 * Tune these values based on how frequently each entity changes.
 */
export const cacheTTL = {
  /** Used in uniqueness checks — kept short to avoid stale "not found" results */
  COMMERCE_DOCUMENT: 60 * 1000, // 60s
  /** Commerce entity — changes rarely (name, hours, description) */
  COMMERCE_ID: 120 * 1000, // 120s
  /** Owner lookup for permission checks — changes rarely */
  COMMERCE_OWNER: 120 * 1000, // 120s
  /** List endpoint — refreshes faster because new commerces appear here */
  COMMERCE_LIST: 30 * 1000, // 30s
  /** Queue per commerce — can change when queue is opened/closed */
  QUEUE_BY_COMMERCE: 60 * 1000, // 60s
} as const;
