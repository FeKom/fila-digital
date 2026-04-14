import { ServerRequest, ServerResponse } from "../../../infra/types";
import { parsePaginationParams } from "../../../utils/pagination";
import {
  findQueueByCommerceId,
  findQueueByIdOnly,
} from "../../queue/repository/queue.repository";
import {
  deleteParticipantsByQueueId,
  enterQueue,
  enterQueueByQrCode,
  findFirstParticipantsByQueueId,
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

const participantsQueueController = () => {
  return {
    enter: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const commerce_id = (req.params as { commerce_id: string }).commerce_id;

        const c = await cache;

        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!user) {
          return res.code(401).send({
            message: "User unauthorized to enter queue",
          });
        }
        if (!queue) {
          return res.status(400).send({
            message: "To enter participant on queue, need to create one first.",
          });
        }
        if (await isUserInQueue(user.id, queue.id)) {
          return res.code(400).send({
            message: "User is already is this queue",
          });
        }
        const body = {
          person_id: user?.id,
          queue_id: queue.id,
          is_active: true,
        };
        const result = await enterQueue(body);
        if (result) {
          return res.status(201).send({
            message: "User entered the commerce queue",
          });
        }
      } catch (error) {
        req.log.error(
          `[Participants-Queue  Controller] - something went wrong, error: ${error}`
        );
        res.code(500).send({
          message: "Failed to enter a queue",
        });
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

        if (!queue) {
          return res.status(400).send({
            message:
              "To list a participants on queue, need to create one first.",
          });
        }

        const page = await findParticipantsByQueueId(queue.id, params);

        if (!page.data.length) {
          return res.status(404).send({
            message: "Participants not found for this queue!",
            data: {
              participants: [],
              nextCursor: null,
              hasMore: false,
            },
          });
        }

        return res.status(200).send({
          data: {
            participants: page.data,
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
          },
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue  Controller] - something went wrong, error: ${error}`
        );
        res.code(500).send({
          message: "Failed to list all",
        });
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

        if (!queue) {
          return res.status(400).send({
            message:
              "To list a participants on queue, need to create one first.",
          });
        }
        if (user && (!commerceData || commerceData.id !== commerce_id)) {
          return res.code(403).send({
            message: "You don't have permission to manage this queue.",
          });
        }
        const firstParticipant = await findFirstParticipantsByQueueId(queue.id);
        if (!firstParticipant) {
          return res.code(400).send({
            message: "Queue is empty, no participants to remove",
          });
        }
        await softDeleteParticipantsByQueueId(
          queue.id,
          firstParticipant.person_id!,
          { is_active: false }
        );
        return res.code(200).send({
          message: "Successfully removed the first participant from the queue",
          data: {
            removedParticipant: firstParticipant.person_id,
          },
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue  Controller] - something went wrong, error: ${error}`
        );
        res.code(500).send({
          message: "Failed to remove Participant",
        });
      }
    },

    removeNextN: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id, count } = req.params as {
          commerce_id: string;
          count: number;
        };

        if (!user) {
          return res.code(401).send({
            message: "Authentication required.",
          });
        }

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

        if (!queue) {
          return res.code(400).send({
            message: "No queue found for this commerce.",
          });
        }

        if (!commerceData || commerceData.id !== commerce_id) {
          return res.code(403).send({
            message: "You don't have permission to manage this queue.",
          });
        }

        const removed = await softDeleteNextNParticipants(queue.id, count);

        if (removed.length === 0) {
          return res.code(400).send({
            message: "Queue is empty, no participants to remove.",
          });
        }

        return res.code(200).send({
          message: `Successfully removed ${removed.length} participant(s) from the queue.`,
          data: {
            removedCount: removed.length,
            removedParticipants: removed.map((p) => p.person_id),
          },
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - removeNextN failed, error: ${error}`
        );
        return res.code(500).send({
          message: "Failed to remove participants.",
        });
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

        const queue = await findQueueByIdOnly(queueId);

        if (!queue) {
          return res.code(404).send({
            message: "Queue not found.",
          });
        }

        if (!queue.active) {
          return res.code(400).send({
            message: "This queue is no longer active.",
          });
        }

        if (queue.status !== "open") {
          return res.code(400).send({
            message: "This queue is not open.",
          });
        }

        if (queue.qrcode_token !== qrcodeToken) {
          return res.code(403).send({
            message: "Invalid QR code token.",
          });
        }

        if (userId) {
          const person = await findUserById(userId);
          if (!person) {
            return res.code(404).send({
              message: "User not found.",
            });
          }

          if (await isUserInQueue(userId, queue.id)) {
            return res.code(400).send({
              message: "User is already in this queue.",
            });
          }

          await enterQueueByQrCode({
            queue_id: queue.id,
            person_id: userId,
          });

          return res.code(201).send({
            message: "User entered the queue via QR code.",
          });
        }

        if (anonymousId) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(anonymousId)) {
            return res.code(400).send({
              message: "Invalid anonymousId format. Must be a valid UUID.",
            });
          }

          if (await isAnonymousInQueue(anonymousId, queue.id)) {
            return res.code(400).send({
              message: "This anonymous user is already in this queue.",
            });
          }

          await enterQueueByQrCode({
            queue_id: queue.id,
            anonymous_id: anonymousId,
          });

          return res.code(201).send({
            message: "Anonymous user entered the queue via QR code.",
          });
        }

        return res.code(400).send({
          message: "Either userId or anonymousId must be provided.",
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue Controller] - enterByQrCode failed, error: ${error}`
        );
        return res.code(500).send({
          message: "Failed to enter queue via QR code.",
        });
      }
    },

    exiteQueue: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user?.id;
        const commerce_id = (req.params as { commerce_id: string }).commerce_id;

        const c = await cache;

        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!queue) {
          return res.status(400).send({
            message: "To exit participant on queue, need to create one first.",
          });
        }
        if (!user) {
          return res.code(401).send({
            message: "Authentication required.",
          });
        }
        const participantdRecord = await deleteParticipantsByQueueId(
          queue.id,
          user
        );
        if (!participantdRecord) {
          return res.code(400).send({
            message: "You are not in this queue!",
          });
        }
        return res.code(200).send({
          message: "Successfully exited the queue! ",
        });
      } catch (error) {
        req.log.error(
          `[Participants-Queue  Controller] - something went wrong, error: ${error}`
        );
        return res.code(500).send({
          message: "Failed to exit queue",
        });
      }
    },
  };
};

export default participantsQueueController;
