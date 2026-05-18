import { createHmac } from "crypto";
import jwt from "jsonwebtoken";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import { parsePaginationParams } from "../../../utils/pagination";
import {
  findQueueByCommerceId,
  findQueueByIdOnly,
  autoCloseQueueIfExpired,
} from "../../queue/repository/queue.repository";
import {
  findCommerceByOwner,
  getCommerceById,
} from "../../commerce/repository/commerce.repository";
import {
  deleteAnonymousFromQueue,
  deleteParticipantsByQueueId,
  dequeueParticipantById,
  enterQueueByQrCode,
  findAnonymousParticipantPosition,
  findFirstParticipantsByQueueId,
  findParticipantPosition,
  findParticipantsByQueueId,
  isAnonymousInQueue,
  isUserInQueue,
  reactivateLastDequeued,
  softDeleteNextNParticipants,
} from "../repository/participants-queue.repository";
import { findUserById } from "../../user/repository/user.repository";
import cache from "../../../infra/database/cache";
import { cacheKeys, cacheTTL } from "../../../utils/cacheKeys";
import { sendError } from "../../../utils/errors";
import { publishQueueEvent, subscribeQueueUpdates } from "../../../infra/redis";
import { notifyParticipantCalled } from "../../notifications/repository/notifications.repository";
import config from "../../../infra/config";
import { User } from "../../user/type";

const ANONYMOUS_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getCookie(
  cookieHeader: string | undefined,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;
  const entry = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return entry?.split("=").slice(1).join("=");
}

const participantsQueueController = () => {
  return {
    enter: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const commerce_id = (req.params as { commerce_id: string }).commerce_id;
        const anonymousId = req.headers["x-anonymous-id"] as string | undefined;

        if (!user && !anonymousId) {
          return sendError(
            res,
            400,
            "Either authentication or anonymousId is required"
          );
        }

        const c = await cache;
        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");
        if (!queue.active)
          return sendError(res, 400, "This queue is no longer active");

        const commerce = await getCommerceById(commerce_id);
        const liveQueue = await autoCloseQueueIfExpired(
          queue,
          commerce?.closed_at ?? null
        );
        if (liveQueue.status !== "open") {
          await c.del(cacheKeys.queueByCommerce(commerce_id));
          return sendError(res, 400, "This queue is not open");
        }

        const token = req.headers.authorization?.split(" ")[1];
        const idempotencyHeader = req.headers["idempotency-key"] as
          | string
          | undefined;

        const participantId = user?.id ?? anonymousId!;

        if (idempotencyHeader) {
          const idempotencySecret = (token ?? anonymousId)!;
          const timeBucket = Math.floor(Date.now() / cacheTTL.IDEMPOTENCY);
          const expectedKey = createHmac("sha256", idempotencySecret)
            .update(`${queue.id}:${participantId}:${timeBucket}`)
            .digest("hex");

          if (idempotencyHeader !== expectedKey) {
            return sendError(res, 400, "Invalid idempotency key");
          }

          const cached = await c.get<{ message: string }>(
            cacheKeys.idempotency(expectedKey)
          );
          if (cached) {
            return res.code(201).send(cached);
          }
        }

        if (user) {
          if (await isUserInQueue(user.id, queue.id)) {
            return sendError(res, 409, "User is already in this queue");
          }
          await enterQueueByQrCode({ queue_id: queue.id, person_id: user.id });
          await c.del(cacheKeys.participantsByQueue(queue.id));
          publishQueueEvent(queue.id);
          const position = await findParticipantPosition(user.id, queue.id);
          const response = { message: "Entered queue", data: { position } };
          if (idempotencyHeader) {
            await c.set(
              cacheKeys.idempotency(idempotencyHeader),
              response,
              cacheTTL.IDEMPOTENCY
            );
          }
          return res.code(201).send(response);
        }

        // Anonymous path
        if (!ANONYMOUS_UUID_REGEX.test(anonymousId!)) {
          return sendError(
            res,
            400,
            "Invalid anonymousId format. Must be a valid UUID"
          );
        }
        if (await isAnonymousInQueue(anonymousId!, queue.id)) {
          return sendError(res, 409, "Already in this queue");
        }
        await enterQueueByQrCode({
          queue_id: queue.id,
          anonymous_id: anonymousId,
        });
        await c.del(cacheKeys.participantsByQueue(queue.id));
        publishQueueEvent(queue.id);
        const response = { message: "Entered queue" };
        if (idempotencyHeader) {
          await c.set(
            cacheKeys.idempotency(idempotencyHeader),
            response,
            cacheTTL.IDEMPOTENCY
          );
        }
        return res.code(201).send(response);
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - enter failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to enter queue");
      }
    },

    listByCommerce: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const commerce_id = (req.params as { commerce_id: string }).commerce_id;
        const params = parsePaginationParams(
          req.query as Record<string, unknown>
        );

        const c = await cache;

        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");

        const page = await c.wrap(
          cacheKeys.participantsByQueue(queue.id, params.cursor, params.limit),
          () => findParticipantsByQueueId(queue.id, params),
          cacheTTL.PARTICIPANTS_LIST
        );

        const participants = page.data.map((p, idx) => ({
          ...p,
          position: idx + 1,
        }));

        return res.code(200).send({
          data: {
            participants,
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
          },
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - listByCommerce failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to list participants");
      }
    },

    removeFirst: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const commerce_id = (req.params as { commerce_id: string }).commerce_id;

        if (!user) return sendError(res, 401, "Authentication required");

        const c = await cache;

        const [queue, commerceData] = await Promise.all([
          c.wrap(
            cacheKeys.queueByCommerce(commerce_id),
            () => findQueueByCommerceId(commerce_id),
            cacheTTL.QUEUE_BY_COMMERCE
          ),
          c.wrap(
            cacheKeys.commerceOwner(user.id),
            () => findCommerceByOwner(user.id),
            cacheTTL.COMMERCE_OWNER
          ),
        ]);

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");

        if (!commerceData || commerceData.id !== commerce_id) {
          return sendError(
            res,
            403,
            "You don't have permission to manage this queue"
          );
        }

        const firstParticipant = await findFirstParticipantsByQueueId(queue.id);
        if (!firstParticipant) return sendError(res, 400, "Queue is empty");

        await dequeueParticipantById(firstParticipant.id);
        await c.del(cacheKeys.participantsByQueue(queue.id));
        publishQueueEvent(queue.id);
        notifyParticipantCalled(
          firstParticipant.person_id,
          firstParticipant.anonymous_id,
          commerceData?.name ?? ""
        ).catch(() => {});

        return res.code(200).send({
          message: "Successfully removed the first participant from the queue",
          data: {
            removedParticipant:
              firstParticipant.person_id ?? firstParticipant.anonymous_id,
          },
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - removeFirst failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to remove participant");
      }
    },

    removeNextN: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id, count } = req.params as {
          commerce_id: string;
          count: number;
        };

        if (!user) return sendError(res, 401, "Authentication required");

        const c = await cache;

        const [queue, commerceData] = await Promise.all([
          c.wrap(
            cacheKeys.queueByCommerce(commerce_id),
            () => findQueueByCommerceId(commerce_id),
            cacheTTL.QUEUE_BY_COMMERCE
          ),
          c.wrap(
            cacheKeys.commerceOwner(user.id),
            () => findCommerceByOwner(user.id),
            cacheTTL.COMMERCE_OWNER
          ),
        ]);

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");

        if (!commerceData || commerceData.id !== commerce_id) {
          return sendError(
            res,
            403,
            "You don't have permission to manage this queue"
          );
        }

        const removed = await softDeleteNextNParticipants(queue.id, count);

        if (removed.length === 0) return sendError(res, 400, "Queue is empty");

        await c.del(cacheKeys.participantsByQueue(queue.id));
        publishQueueEvent(queue.id);
        removed.forEach((p) =>
          notifyParticipantCalled(
            p.person_id,
            p.anonymous_id,
            commerceData?.name ?? ""
          ).catch(() => {})
        );

        return res.code(200).send({
          message: `Successfully removed ${removed.length} participant(s) from the queue`,
          data: {
            removedCount: removed.length,
            removedParticipants: removed.map((p) => p.person_id),
          },
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - removeNextN failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to remove participants");
      }
    },

    revertLast: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id, count } = req.params as {
          commerce_id: string;
          count?: number;
        };
        const n = count ?? 1;

        if (!user) return sendError(res, 401, "Authentication required");

        const c = await cache;

        const [queue, commerceData] = await Promise.all([
          c.wrap(
            cacheKeys.queueByCommerce(commerce_id),
            () => findQueueByCommerceId(commerce_id),
            cacheTTL.QUEUE_BY_COMMERCE
          ),
          c.wrap(
            cacheKeys.commerceOwner(user.id),
            () => findCommerceByOwner(user.id),
            cacheTTL.COMMERCE_OWNER
          ),
        ]);

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");

        if (!commerceData || commerceData.id !== commerce_id)
          return sendError(
            res,
            403,
            "You don't have permission to manage this queue"
          );

        const reverted = await reactivateLastDequeued(queue.id, n);

        if (reverted.length === 0)
          return sendError(
            res,
            400,
            "No recently served participants to revert"
          );

        await c.del(cacheKeys.participantsByQueue(queue.id));
        publishQueueEvent(queue.id);

        return res.code(200).send({
          message: `Successfully reverted ${reverted.length} participant(s)`,
          data: { revertedCount: reverted.length },
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - revertLast failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to revert participants");
      }
    },

    enterByQrCode: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const { queueId, qrcodeToken, userId, anonymousId } = req.body as {
          queueId: string;
          qrcodeToken: string;
          userId?: string;
          anonymousId?: string;
        };

        const idempotencyHeader = req.headers["idempotency-key"] as
          | string
          | undefined;

        const queue = await findQueueByIdOnly(queueId);

        if (!queue) return sendError(res, 404, "Queue not found");
        if (!queue.active)
          return sendError(res, 400, "This queue is no longer active");
        if (queue.status !== "open")
          return sendError(res, 400, "This queue is not open");
        if (queue.qrcode_token !== qrcodeToken)
          return sendError(res, 403, "Invalid QR code token");

        const c = await cache;

        if (idempotencyHeader) {
          const participantId = userId ?? anonymousId;
          const timeBucket = Math.floor(Date.now() / cacheTTL.IDEMPOTENCY);
          const expectedKey = createHmac("sha256", qrcodeToken)
            .update(`${queueId}:${participantId}:${timeBucket}`)
            .digest("hex");

          if (idempotencyHeader !== expectedKey) {
            return sendError(res, 400, "Invalid idempotency key");
          }

          const cached = await c.get<{ message: string }>(
            cacheKeys.idempotency(expectedKey)
          );
          if (cached) {
            return res.code(201).send(cached);
          }
        }

        if (userId) {
          const person = await findUserById(userId);
          if (!person) return sendError(res, 404, "User not found");

          if (await isUserInQueue(userId, queue.id)) {
            return sendError(res, 409, "User is already in this queue");
          }

          await enterQueueByQrCode({ queue_id: queue.id, person_id: userId });
          await c.del(cacheKeys.participantsByQueue(queue.id));
          publishQueueEvent(queue.id);
          const response = { message: "User entered the queue via QR code" };

          if (idempotencyHeader) {
            await c.set(
              cacheKeys.idempotency(idempotencyHeader),
              response,
              cacheTTL.IDEMPOTENCY
            );
          }

          return res.code(201).send(response);
        }

        if (anonymousId) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(anonymousId)) {
            return sendError(
              res,
              400,
              "Invalid anonymousId format. Must be a valid UUID"
            );
          }

          if (await isAnonymousInQueue(anonymousId, queue.id)) {
            return sendError(
              res,
              409,
              "This anonymous user is already in this queue"
            );
          }

          await enterQueueByQrCode({
            queue_id: queue.id,
            anonymous_id: anonymousId,
          });
          await c.del(cacheKeys.participantsByQueue(queue.id));
          publishQueueEvent(queue.id);
          const response = {
            message: "Anonymous user entered the queue via QR code",
          };

          if (idempotencyHeader) {
            await c.set(
              cacheKeys.idempotency(idempotencyHeader),
              response,
              cacheTTL.IDEMPOTENCY
            );
          }

          return res.code(201).send(response);
        }

        return sendError(
          res,
          400,
          "Either userId or anonymousId must be provided"
        );
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - enterByQrCode failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to enter queue via QR code");
      }
    },

    exiteQueue: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const commerce_id = (req.params as { commerce_id: string }).commerce_id;
        const anonymousId = req.headers["x-anonymous-id"] as string | undefined;

        if (!user && !anonymousId) {
          return sendError(
            res,
            400,
            "Either authentication or anonymousId is required"
          );
        }

        const c = await cache;

        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");

        if (user) {
          const participantRecord = await deleteParticipantsByQueueId(
            queue.id,
            user.id
          );
          if (!participantRecord)
            return sendError(res, 400, "You are not in this queue");
        } else {
          const participantRecord = await deleteAnonymousFromQueue(
            queue.id,
            anonymousId!
          );
          if (
            !participantRecord ||
            participantRecord.numUpdatedRows === BigInt(0)
          )
            return sendError(res, 400, "You are not in this queue");
        }

        await c.del(cacheKeys.participantsByQueue(queue.id));
        publishQueueEvent(queue.id);

        return res.code(200).send({ message: "Successfully exited the queue" });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - exitQueue failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to exit queue");
      }
    },

    getMyPosition: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const commerce_id = (req.params as { commerce_id: string }).commerce_id;
        const anonymousId = req.headers["x-anonymous-id"] as string | undefined;

        if (!user && !anonymousId) {
          return sendError(
            res,
            400,
            "Either authentication or anonymousId is required"
          );
        }

        const c = await cache;

        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");

        const position = user
          ? await findParticipantPosition(user.id, queue.id)
          : await findAnonymousParticipantPosition(anonymousId!, queue.id);

        if (position === null)
          return sendError(res, 404, "You are not in this queue");

        return res.code(200).send({ data: { position } });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - getMyPosition failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to get queue position");
      }
    },

    /**
     * SSE endpoint — streams live queue position to the connected client.
     * Auth: reads the JWT from the `digital_queue_jwt` cookie (sent automatically
     * by browsers with withCredentials). Anonymous users pass ?anonymous_id=<uuid>.
     * Heartbeat every 25 s prevents Render's 100 s idle-timeout.
     */
    streamPosition: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const { commerce_id } = req.params as { commerce_id: string };
        const { anonymous_id: queryAnonId } = req.query as {
          anonymous_id?: string;
        };

        // ── Auth (must happen before hijack so we can still send HTTP errors) ──
        let userId: string | undefined;
        let anonymousId: string | undefined;

        const jwtToken = getCookie(req.headers.cookie, "digital_queue_jwt");
        if (jwtToken) {
          try {
            const JWT_SECRET = config.get<string>("token.secret");
            const decoded = jwt.verify(jwtToken, JWT_SECRET) as User;
            userId = decoded.id;
          } catch {
            // expired / invalid — fall through to anonymous
          }
        }

        if (!userId) {
          anonymousId = queryAnonId;
        }

        if (!userId && !anonymousId) {
          return sendError(res, 401, "Authentication or anonymous_id required");
        }

        // ── Resolve queue ──────────────────────────────────────────────────────
        const c = await cache;
        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );
        if (!queue)
          return sendError(res, 404, "No queue found for this commerce");

        const getCurrentPosition = () =>
          userId
            ? findParticipantPosition(userId!, queue.id)
            : findAnonymousParticipantPosition(anonymousId!, queue.id);

        // Validate the user is actually in the queue before opening the stream
        const initialPosition = await getCurrentPosition();
        if (initialPosition === null)
          return sendError(res, 404, "You are not in this queue");

        // ── Open SSE stream ────────────────────────────────────────────────────
        res.raw.setHeader("Content-Type", "text/event-stream");
        res.raw.setHeader("Cache-Control", "no-cache, no-transform");
        res.raw.setHeader("Connection", "keep-alive");
        res.raw.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
        res.hijack();
        res.raw.flushHeaders();

        const write = (data: object) => {
          if (res.raw.writable)
            res.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // Send initial position immediately
        write({ position: initialPosition, queue_id: queue.id });

        // Heartbeat — keeps the connection alive through Render's idle timeout
        const heartbeat = setInterval(() => {
          if (res.raw.writable) res.raw.write(": ping\n\n");
        }, 25_000);

        let active = true;
        let unsubscribe = () => {};

        const cleanup = () => {
          if (!active) return;
          active = false;
          clearInterval(heartbeat);
          unsubscribe();
          if (res.raw.writable) res.raw.end();
        };

        unsubscribe = subscribeQueueUpdates(queue.id, async () => {
          if (!active) return;
          try {
            const position = await getCurrentPosition();
            if (position === null) {
              write({ event: "exited", queue_id: queue.id });
              cleanup();
              return;
            }
            write({ position, queue_id: queue.id });
          } catch {
            // transient DB error — keep stream open, next event will recover
          }
        });

        req.raw.on("close", cleanup);
        req.raw.on("error", cleanup);
      } catch (error) {
        req.log.error(`[SSE] streamPosition failed: ${error}`);
        if (res.raw.writable) res.raw.end();
      }
    },
  };
};

export default participantsQueueController;
