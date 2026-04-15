import { createCache, KeyvAdapter } from "cache-manager";
import { Keyv } from "keyv";
import { redisStore } from "cache-manager-redis-yet";
import config from "../config";
import { logger } from "../../utils/logger";

const cacheConfig = config.get<{
  host: string;
  port: number;
  ttl: number;
}>("cache");

function buildMemoryCache() {
  const keyv = new Keyv({ ttl: cacheConfig.ttl * 1000 });
  logger.warn(
    "[Cache] Using in-memory cache (data will not persist across restarts)"
  );
  return createCache({ stores: [keyv] });
}

async function buildCache() {
  if (!cacheConfig.host) {
    logger.warn(
      "[Cache] Redis host not configured, falling back to in-memory cache"
    );
    return buildMemoryCache();
  }

  try {
    const store = await redisStore({
      socket: {
        host: cacheConfig.host,
        port: cacheConfig.port,
        connectTimeout: 5000,
      },
      ttl: cacheConfig.ttl * 1000,
    });

    // Prevent unhandled 'error' events from crashing the process
    store.client.on("error", (err: Error) => {
      logger.warn(`[Cache] Redis error: ${err.message}`);
    });

    const adapter = new KeyvAdapter(store);
    const keyv = new Keyv({ store: adapter });

    logger.info(
      `[Cache] Redis connected at ${cacheConfig.host}:${cacheConfig.port}`
    );

    return createCache({ stores: [keyv] });
  } catch (error) {
    logger.warn(
      `[Cache] Redis unavailable (${error}), falling back to in-memory cache`
    );
    return buildMemoryCache();
  }
}

const cache = buildCache();

export default cache;
