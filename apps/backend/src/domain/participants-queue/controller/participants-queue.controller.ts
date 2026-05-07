import { createHmac } from "crypto";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import { parsePaginationParams } from "../../../utils/pagination";
import {
  findQueueByCommerceId,
  findQueueByIdOnly,
} from "../../queue/repository/queue.repository";
import {
  deleteAnonymousFromQueue,
  deleteParticipantsByQueueId,
  enterQueueByQrCode,
  findAnonymousParticipantPosition,
  findFirstParticipantsByQueueId,
  findParticipantPosition,
  findParticipantsByQueueId,
  isAnonymousInQueue,
  isUserInQueue,
  softDeleteParticipantsByQueueId,
  softDeleteNextNParticipants,
} from "../repository/participants-queue.repository";
import { findUserById } from "../../user/repository/user.repository";
import { findCommerceOwnerByUserId } from "../../commerce/repository/commerce.repository";
import cache from "../../../infra/database/cache";
import { cacheKeys, cacheTTL } from "../../../utils/cacheKeys";
import { sendError } from "../../../utils/errors";
const ANONYMOUS_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        if (queue.status !== "open")
          return sendError(res, 400, "This queue is not open");

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

        return res.code(200).send({
          data: {
            participants: page.data,
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

        const c = await cache;

        const [queue, commerceData] = await Promise.all([
          c.wrap(
            cacheKeys.queueByCommerce(commerce_id),
            () => findQueueByCommerceId(commerce_id),
            cacheTTL.QUEUE_BY_COMMERCE
          ),
          user
            ? c.wrap(
                cacheKeys.commerceOwner(user.id),
                () => findCommerceOwnerByUserId(user.id),
                cacheTTL.COMMERCE_OWNER
              )
            : Promise.resolve(null),
        ]);

        if (!queue)
          return sendError(res, 400, "No queue found for this commerce");

        if (!user) return sendError(res, 401, "Authentication required");

        if (!commerceData || commerceData.id !== commerce_id) {
          return sendError(
            res,
            403,
            "You don't have permission to manage this queue"
          );
        }

        const firstParticipant = await findFirstParticipantsByQueueId(queue.id);
        if (!firstParticipant) return sendError(res, 400, "Queue is empty");

        await softDeleteParticipantsByQueueId(
          queue.id,
          firstParticipant.person_id!,
          { is_active: false }
        );

        await c.del(cacheKeys.participantsByQueue(queue.id));

        return res.code(200).send({
          message: "Successfully removed the first participant from the queue",
          data: { removedParticipant: firstParticipant.person_id },
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
            () => findCommerceOwnerByUserId(user.id),
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
          const response = { message: "User entered the queue via QR code" };

          await c.del(cacheKeys.participantsByQueue(queue.id));

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
          const response = {
            message: "Anonymous user entered the queue via QR code",
          };

          await c.del(cacheKeys.participantsByQueue(queue.id));

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
  };
};

export default participantsQueueController;
