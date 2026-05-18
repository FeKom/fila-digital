import Redis from "ioredis";
import config from "./config";
import { logger } from "../utils/logger";

const cacheConf = config.get<{ url?: string; host: string; port: number }>(
  "cache"
);

function buildRedisUrl(): string | null {
  if (cacheConf.url) return cacheConf.url;
  if (cacheConf.host) return `redis://${cacheConf.host}:${cacheConf.port}`;
  return null;
}

const REDIS_URL = buildRedisUrl();

// BullMQ requires these two options on every connection.
const BULLMQ_OPTIONS = {
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
};

let _pub: Redis | null = null;
let _sub: Redis | null = null;

// Per-channel handler sets — avoids one ioredis connection per SSE client.
const channelHandlers = new Map<string, Set<(message: string) => void>>();

function createClient(extraOptions?: object): Redis | null {
  if (!REDIS_URL) return null;
  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect: false,
      ...extraOptions,
    });
    client.on("error", (err: Error) => logger.warn(`[Redis] ${err.message}`));
    return client;
  } catch (err) {
    logger.warn(`[Redis] Failed to create client: ${err}`);
    return null;
  }
}

/** Shared publish/general-purpose client. Compatible with BullMQ. */
export function getRedisClient(): Redis | null {
  if (!_pub) {
    _pub = createClient(BULLMQ_OPTIONS);
    if (_pub) logger.info("[Redis] Pub client connected");
  }
  return _pub;
}

/** Dedicated subscriber connection (in subscribe mode it can't issue commands). */
function getSubscriber(): Redis | null {
  if (!_sub) {
    _sub = createClient();
    if (_sub) {
      logger.info("[Redis] Sub client connected");
      _sub.on("message", (channel: string, message: string) => {
        channelHandlers.get(channel)?.forEach((fn) => fn(message));
      });
    }
  }
  return _sub;
}

/**
 * Publish a queue-changed notification. Fire-and-forget — callers do not await.
 */
export function publishQueueEvent(queueId: string): void {
  const pub = getRedisClient();
  if (!pub) return;
  pub
    .publish(`queue:${queueId}`, JSON.stringify({ queueId, ts: Date.now() }))
    .catch((err: Error) =>
      logger.warn(`[Redis] publish error: ${err.message}`)
    );
}

/**
 * Subscribe to queue change events for `queueId`.
 * Returns an unsubscribe function — call it when the SSE connection closes.
 * Gracefully no-ops when Redis is unavailable.
 */
export function subscribeQueueUpdates(
  queueId: string,
  handler: (message: string) => void
): () => void {
  const sub = getSubscriber();
  if (!sub) return () => {};

  const channel = `queue:${queueId}`;

  if (!channelHandlers.has(channel)) {
    channelHandlers.set(channel, new Set());
    sub
      .subscribe(channel)
      .catch((err: Error) =>
        logger.warn(`[Redis] subscribe error: ${err.message}`)
      );
  }

  channelHandlers.get(channel)!.add(handler);

  return () => {
    const handlers = channelHandlers.get(channel);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      channelHandlers.delete(channel);
      sub
        .unsubscribe(channel)
        .catch((err: Error) =>
          logger.warn(`[Redis] unsubscribe error: ${err.message}`)
        );
    }
  };
}
