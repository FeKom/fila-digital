import { ServerRequest, ServerResponse } from "../../../infra/types";
import { Queue } from "../type";
import { findCommerceOwnerByUserId } from "../../commerce/repository/commerce.repository";
import {
  findQueueByCommerceId,
  createQueue,
  updateQueueById,
} from "../repository/queue.repository";
import cache from "../../../infra/database/cache";
import { cacheKeys, cacheTTL } from "../../../utils/cacheKeys";
import { generateQrCodeBase64 } from "../../../utils/qrcode";

const queueController = () => {
  return {
    register: async (req: ServerRequest, res: ServerResponse) => {
      const queue = req.body as Queue;
      try {
        if (req.user?.id) {
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
            return await res.code(409).send({
              message: "This commerce Alreay has a Queue!",
            });
          }

          if (commerceOwner.owner_id === req.user.id) {
            const createdQueue = await createQueue(queue);

            await c.del(cacheKeys.queueByCommerce(queue.commerce_id));

            const qrcodeData = {
              queueId: createdQueue.id,
              token: createdQueue.qrcode_token,
              createdAt: createdQueue.created_at,
            };

            const qrcode = await generateQrCodeBase64(
              JSON.stringify(qrcodeData)
            );

            return res.code(201).send({
              queue: {
                id: createdQueue.id,
                commerce_id: createdQueue.commerce_id,
              },
              qrcode,
              qrcodeData,
              message: "Queue created with success!",
            });
          } else if (commerceOwner.owner_id !== req.user.id) {
            return res.code(401).send({
              message: "Only commerce owner can create a queue",
            });
          }

          return res.code(401).send({
            message: "You need to register a commerce first, to create a queue",
          });
        }
      } catch (error) {
        req.log.error(error);
        return res.code(500).send({
          message: "Error for create a Queue!",
        });
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

        if (!queue) {
          return res.code(404).send({
            message: "Queue not found!",
          });
        }

        if (user) {
          const commerceOwner = await c.wrap(
            cacheKeys.commerceOwner(user.id),
            () => findCommerceOwnerByUserId(user.id),
            cacheTTL.COMMERCE_OWNER
          );

          if (!commerceOwner) {
            return res.code(401).send({
              message: "You need to be a commerce owner to update a queue",
            });
          }

          if (commerceOwner.owner_id !== user?.id) {
            return res.code(401).send({
              message: "Only commerce owner can update a queue",
            });
          }
        }

        await updateQueueById(queue_id, { ...queueToUpdate });

        await c.del(cacheKeys.queueByCommerce(commerce_id));

        return res.code(200).send({
          message: "Queue updated with success!",
          data: {
            queueToUpdate,
          },
        });
      } catch (error) {
        req.log.error(error);
        return await res.code(500).send({
          message: "Error for update a Queue!",
        });
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

        if (!queue) {
          return res.code(404).send({
            message: "Queue not found!",
          });
        }

        if (user) {
          const commerce = await c.wrap(
            cacheKeys.commerceOwner(user.id),
            () => findCommerceOwnerByUserId(user.id),
            cacheTTL.COMMERCE_OWNER
          );

          if (!commerce) {
            return res.code(401).send({
              message: "You need to be a commerce owner to delete a queue",
            });
          }

          if (commerce.owner_id !== user?.id) {
            return res.code(401).send({
              message: "Only commerce owner can delete a queue",
            });
          }
        }

        await updateQueueById(queue_id, { active: false });

        await c.del(cacheKeys.queueByCommerce(commerce_id));

        return res.code(200).send({
          message: "Queue deleted with success!",
        });
      } catch (error) {
        req.log.error(error);
        return await res.code(500).send({
          message: "Error for delete a Queue!",
        });
      }
    },
  };
};

export default queueController;
