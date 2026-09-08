import { ServerRequest, ServerResponse } from "../../../infra/types";
import { Queue } from "../type";
import { findCommerceOwnerByUserId } from "../../commerce/repository/commerce.repository";
import {
  findQueueByCommerceId,
  createQueue,
  updateQueueById,
} from "../repository/queue.repository";
import {
  createQueueSchedule,
  findScheduleByQueueId,
  updateScheduleStatus,
} from "../repository/queue-schedule.repository";
import cache from "../../../infra/database/cache";
import { cacheKeys, cacheTTL } from "../../../utils/cacheKeys";
import { generateQrCodeBase64 } from "../../../utils/qrcode";
import { sendError } from "../../../utils/errors";
import config from "../../../infra/config";
import { canonicalOrigin } from "../../../utils/origins";

const queueController = () => {
  return {
    register: async (req: ServerRequest, res: ServerResponse) => {
      const queue = req.body as Queue;
      try {
        if (!req.user?.id) {
          sendError(res, 401, "Authentication required");
          return;
        }

        const c = await cache;

        const [commerceOwner, commerceWithQueue] = await Promise.all([
          c.wrap(
            cacheKeys.commerceOwner(req.user.id),
            () => findCommerceOwnerByUserId(req.user!.id),
            cacheTTL.COMMERCE_OWNER
          ),
          c.wrap(
            cacheKeys.queueByCommerce(queue.commerce_id),
            () => findQueueByCommerceId(queue.commerce_id),
            cacheTTL.QUEUE_BY_COMMERCE
          ),
        ]);

        if (commerceWithQueue) {
          sendError(res, 409, "This commerce already has a queue");
          return;
        }

        if (commerceOwner.owner_id !== req.user.id) {
          sendError(res, 403, "Only commerce owner can create a queue");
          return;
        }

        const createdQueue = await createQueue(queue);
        await c.del(cacheKeys.queueByCommerce(queue.commerce_id));

        const qrcode = await generateQrCodeBase64(
          `${canonicalOrigin()}/entrar-fila?commerceId=${createdQueue.commerce_id}&token=${createdQueue.qrcode_token}&mode=qrcode`
        );

        return res.code(201).send({
          queue: { id: createdQueue.id, commerce_id: createdQueue.commerce_id },
          qrcode,
          message: "Queue created successfully",
        });
      } catch (error) {
        req.log.error(error);
        return sendError(res, 500, "Failed to create queue");
      }
    },

    update: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const queueToUpdate = req.body as Queue;
        const { commerce_id, queue_id } = req.params as {
          commerce_id: string;
          queue_id: string;
        };

        const c = await cache;

        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!queue) return sendError(res, 404, "Queue not found");

        if (user) {
          const commerceOwner = await c.wrap(
            cacheKeys.commerceOwner(user.id),
            () => findCommerceOwnerByUserId(user.id),
            cacheTTL.COMMERCE_OWNER
          );

          if (!commerceOwner) {
            return sendError(
              res,
              403,
              "You need to be a commerce owner to update a queue"
            );
          }

          if (commerceOwner.owner_id !== user.id) {
            return sendError(
              res,
              403,
              "Only commerce owner can update a queue"
            );
          }
        }

        await updateQueueById(queue_id, { ...queueToUpdate });
        await c.del(cacheKeys.queueByCommerce(commerce_id));

        return res.code(200).send({
          message: "Queue updated successfully",
          data: { queueToUpdate },
        });
      } catch (error) {
        req.log.error(error);
        return sendError(res, 500, "Failed to update queue");
      }
    },

    softDeleteQueue: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id, queue_id } = req.params as {
          commerce_id: string;
          queue_id: string;
        };

        const c = await cache;

        const queue = await c.wrap(
          cacheKeys.queueByCommerce(commerce_id),
          () => findQueueByCommerceId(commerce_id),
          cacheTTL.QUEUE_BY_COMMERCE
        );

        if (!queue) return sendError(res, 404, "Queue not found");

        if (user) {
          const commerce = await c.wrap(
            cacheKeys.commerceOwner(user.id),
            () => findCommerceOwnerByUserId(user.id),
            cacheTTL.COMMERCE_OWNER
          );

          if (!commerce) {
            return sendError(
              res,
              403,
              "You need to be a commerce owner to delete a queue"
            );
          }

          if (commerce.owner_id !== user.id) {
            return sendError(
              res,
              403,
              "Only commerce owner can delete a queue"
            );
          }
        }

        await updateQueueById(queue_id, { active: false });
        await c.del(cacheKeys.queueByCommerce(commerce_id));

        return res.code(200).send({ message: "Queue deleted successfully" });
      } catch (error) {
        req.log.error(error);
        return sendError(res, 500, "Failed to delete queue");
      }
    },

    createSchedule: async (req: ServerRequest, res: ServerResponse) => {
      try {
        if (!req.user?.id)
          return sendError(res, 401, "Authentication required");

        const { commerce_id, queue_id } = req.params as {
          commerce_id: string;
          queue_id: string;
        };
        const body = req.body as {
          type: "once" | "daily";
          scheduled_at?: string;
        };

        const c = await cache;
        const commerceOwner = await c.wrap(
          cacheKeys.commerceOwner(req.user.id),
          () => findCommerceOwnerByUserId(req.user!.id),
          cacheTTL.COMMERCE_OWNER
        );
        if (commerceOwner.owner_id !== req.user.id) {
          return sendError(
            res,
            403,
            "Only commerce owner can manage schedules"
          );
        }

        if (body.type === "once" && !body.scheduled_at) {
          return sendError(
            res,
            400,
            "scheduled_at is required for one-time schedules"
          );
        }

        const schedule = await createQueueSchedule({
          queue_id,
          commerce_id,
          type: body.type,
          scheduled_at: body.scheduled_at ?? undefined,
          status: "active",
        });

        return res.code(201).send({ data: schedule });
      } catch (error) {
        req.log.error(error);
        return sendError(res, 500, "Failed to create schedule");
      }
    },

    getSchedule: async (req: ServerRequest, res: ServerResponse) => {
      try {
        if (!req.user?.id)
          return sendError(res, 401, "Authentication required");

        const { queue_id } = req.params as { queue_id: string };
        const schedule = await findScheduleByQueueId(queue_id);
        return res.code(200).send({ data: schedule ?? null });
      } catch (error) {
        req.log.error(error);
        return sendError(res, 500, "Failed to get schedule");
      }
    },

    toggleSchedule: async (req: ServerRequest, res: ServerResponse) => {
      try {
        if (!req.user?.id)
          return sendError(res, 401, "Authentication required");

        const { schedule_id } = req.params as {
          commerce_id: string;
          schedule_id: string;
        };
        const body = req.body as { status: "active" | "inactive" };

        const c = await cache;
        const commerceOwner = await c.wrap(
          cacheKeys.commerceOwner(req.user.id),
          () => findCommerceOwnerByUserId(req.user!.id),
          cacheTTL.COMMERCE_OWNER
        );
        if (commerceOwner.owner_id !== req.user.id) {
          return sendError(
            res,
            403,
            "Only commerce owner can manage schedules"
          );
        }

        await updateScheduleStatus(schedule_id, body.status);
        return res.code(200).send({ message: "Schedule updated" });
      } catch (error) {
        req.log.error(error);
        return sendError(res, 500, "Failed to update schedule");
      }
    },
  };
};

export default queueController;
