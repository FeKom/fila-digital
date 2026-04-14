import { uuidv7 } from "uuidv7";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import { updateUserById } from "../../user/repository/user.repository";
import {
  createCommerce,
  getCommerceByDocumentId,
  getCommerceById,
  listAllCommerces,
  updateCommerceById,
} from "../repository/commerce.repository";
import { Commerce } from "../type";
import { validateCNPJ } from "../../../utils/validate";
import { logger } from "../../../utils/logger";
import cache from "../../../infra/database/cache";
import { cacheKeys, cacheTTL } from "../../../utils/cacheKeys";
import { parsePaginationParams } from "../../../utils/pagination";

const commerceController = () => {
  return {
    register: async (req: ServerRequest, res: ServerResponse) => {
      const commerce = req.body as Commerce;
      try {
        const valid = validateCNPJ(commerce.document_id);
        if (!valid) {
          res.code(400).send({
            message: "Invalid Document ID",
          });
          return;
        }

        const c = await cache;

        const commerceFromDb = await c.wrap(
          cacheKeys.commerceDocument(valid),
          () => getCommerceByDocumentId(valid),
          cacheTTL.COMMERCE_DOCUMENT
        );

        if (!req.user?.id) return;

        if (commerceFromDb) {
          res.code(409).send({
            message: "Commerce already registered",
          });
          return;
        }

        const commerceData = await createCommerce({
          ...commerce,
          id: uuidv7(),
          owner_id: req.user.id,
          document_id: valid,
        });

        await Promise.all([
          c.del(cacheKeys.commerceDocument(valid)),
          c.del(cacheKeys.commerceOwner(req.user.id)),
          c.del(cacheKeys.commerceList()),
        ]);

        await updateUserById(req.user.id, {
          commerce_id: commerceData?.id,
        });

        res.code(201).send({
          commerce_id: commerceData?.id,
          name: commerceData?.name,
          message: "successfully registered",
        });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - something went wrong, error: ${error}`
        );
        res.code(500).send({
          message: "Error for Register Commerce!",
        });
      }
    },

    getAllCommerces: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const params = parsePaginationParams(
          req.query as Record<string, unknown>
        );

        // Paginated lists are not cached — each (cursor, limit) combination
        // produces a different result set. Individual commerce entities are
        // already cached by ID in getCommerceById.
        const page = await listAllCommerces(params);

        return res.code(200).send({
          message: "Commerces retrieved successfully",
          data: {
            commerces: page.data,
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
          },
        });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to get commerces, error: ${error}`
        );
        return res.code(500).send({
          message: "Failed to retrieve commerces",
        });
      }
    },

    softDeleteCommerce: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id } = req.params as { commerce_id: string };

        if (!user) {
          return res.code(401).send({
            message: "You need to be logged in to delete a commerce",
          });
        }

        const c = await cache;

        const commerce = await c.wrap(
          cacheKeys.commerceId(commerce_id),
          () => getCommerceById(commerce_id),
          cacheTTL.COMMERCE_ID
        );

        if (!commerce) {
          return res.code(404).send({
            message: "Commerce not found",
          });
        }

        if (commerce.owner_id !== user.id) {
          return res.code(401).send({
            message: "Only commerce owner can delete a commerce",
          });
        }

        await updateCommerceById(commerce_id, { active: false });

        await Promise.all([
          c.del(cacheKeys.commerceId(commerce_id)),
          c.del(cacheKeys.commerceList()),
          c.del(cacheKeys.commerceOwner(user.id)),
        ]);

        return res.code(200).send({
          message: "Commerce deleted with success!",
        });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to delete commerce, error: ${error}`
        );
        return res.code(500).send({
          message: "Failed to delete commerce",
        });
      }
    },

    updateCommerce: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const commerceToUpdate = req.body as Commerce;
        const { commerce_id } = req.params as { commerce_id: string };

        if (!user) {
          return res.code(401).send({
            message: "You need to be logged in to update a commerce",
          });
        }

        const c = await cache;

        const commerce = await c.wrap(
          cacheKeys.commerceId(commerce_id),
          () => getCommerceById(commerce_id),
          cacheTTL.COMMERCE_ID
        );

        if (!commerce) {
          return res.code(404).send({
            message: "Commerce not found",
          });
        }

        if (commerce.owner_id !== user.id) {
          return res.code(401).send({
            message: "Only commerce owner can update a commerce",
          });
        }

        await updateCommerceById(commerce_id, { ...commerceToUpdate });

        await Promise.all([
          c.del(cacheKeys.commerceId(commerce_id)),
          c.del(cacheKeys.commerceList()),
        ]);

        return res.code(200).send({
          message: "Commerce updated successfully",
          data: {
            commerceToUpdate,
          },
        });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to update commerce, error: ${error}`
        );
        return res.code(500).send({
          message: "Failed to update commerce",
        });
      }
    },
  };
};

export default commerceController;
