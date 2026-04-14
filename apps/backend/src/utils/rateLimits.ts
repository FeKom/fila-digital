import { RateLimitOptions } from "@fastify/rate-limit";

/**
 * Named rate limit configurations used across all route files.
 *
 * Categories:
 *   auth    → login / register — tight limit to block brute force
 *   write   → POST / PUT / DELETE — moderate limit
 *   read    → GET — generous limit
 *   open    → public endpoints that must never be blocked (healthcheck)
 */

const BASE: Partial<RateLimitOptions> = {
  keyGenerator: (req) =>
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.ip,
  errorResponseBuilder: (_req, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: `Rate limit exceeded. Try again in ${context.after}.`,
    retryAfter: context.after,
  }),
};

export const rateLimits = {
  /**
   * Auth endpoints: 10 requests per minute per IP.
   * Tight limit to block brute-force attacks on login and register.
   */
  auth: {
    ...BASE,
    max: 10,
    timeWindow: "1 minute",
  } satisfies RateLimitOptions,

  /**
   * Write endpoints (POST / PUT / DELETE): 60 requests per minute per IP.
   * Prevents abuse of mutation endpoints without blocking normal usage.
   */
  write: {
    ...BASE,
    max: 60,
    timeWindow: "1 minute",
  } satisfies RateLimitOptions,

  /**
   * Read endpoints (GET): 200 requests per minute per IP.
   * Generous limit — read-heavy clients (e.g. polling UIs) must not be blocked.
   */
  read: {
    ...BASE,
    max: 200,
    timeWindow: "1 minute",
  } satisfies RateLimitOptions,

  /**
   * No rate limit.
   * Used for the /healthcheck route — UptimeRobot and load balancers
   * probe this endpoint frequently and must never get a 429.
   */
  open: false as const,
} as const;
