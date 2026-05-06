import { uuidv7 } from "uuidv7";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import {
  updateUserById,
  getUserByEmail,
} from "../../user/repository/user.repository";
import {
  createCommerce,
  getCommerceByDocumentId,
  getCommerceById,
  listAllCommerces,
  updateCommerceById,
  findNearbyOpenQueues,
  findNearbyOpenQueuesByCepPrefix,
  searchOpenQueues,
} from "../repository/commerce.repository";
import {
  upsertAddress,
  getAddressByCommerceId,
} from "../repository/address.repository";
import { findQueueByCommerceId } from "../../queue/repository/queue.repository";
import {
  grantCommerceAdmin,
  revokeCommerceAdmin,
  listCommerceAdmins,
} from "../repository/commerce-admin.repository";
import { validateCNPJ } from "../../../utils/validate";
import { hashDocument } from "../../../utils/documentHash";
import { logger } from "../../../utils/logger";
import cache from "../../../infra/database/cache";
import { cacheKeys, cacheTTL } from "../../../utils/cacheKeys";
import { parsePaginationParams } from "../../../utils/pagination";
import { sendError } from "../../../utils/errors";

const commerceController = () => {
  return {
    register: async (req: ServerRequest, res: ServerResponse) => {
      const body = req.body as Record<string, unknown>;
      req.log.debug({ body: req.body }, "[Commerce] register — received body");
      try {
        const valid = validateCNPJ(body.document_id as string);
        if (!valid) {
          sendError(res, 400, "Invalid Document ID");
          return;
        }
        const documentHash = hashDocument(valid);

        const c = await cache;

        const commerceFromDb = await c.wrap(
          cacheKeys.commerceDocument(documentHash),
          () => getCommerceByDocumentId(documentHash),
          cacheTTL.COMMERCE_DOCUMENT
        );

        if (!req.user?.id) {
          sendError(res, 401, "Authentication required");
          return;
        }

        if (commerceFromDb) {
          sendError(res, 409, "Commerce already registered");
          return;
        }

        const commerceData = await createCommerce({
          name: body.name as string,
          description: (body.description as string) ?? null,
          phone: (body.phone as string) ?? null,
          open_at: (body.open_at as string) ?? undefined,
          closed_at: (body.closed_at as string) ?? undefined,
          id: uuidv7(),
          owner_id: req.user.id,
          document_id: documentHash,
        });

        // Upsert address if any address field was provided
        if (commerceData?.id) {
          const {
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            cep,
            latitude,
            longitude,
          } = body;
          if (
            street ||
            number ||
            neighborhood ||
            city ||
            cep ||
            latitude ||
            longitude
          ) {
            await upsertAddress(commerceData.id, {
              street: (street as string) ?? null,
              number: (number as string) ?? null,
              complement: (complement as string) ?? null,
              neighborhood: (neighborhood as string) ?? null,
              city: (city as string) ?? null,
              state: (state as string) ?? null,
              cep: (cep as string) ?? null,
              latitude: latitude != null ? Number(latitude) : null,
              longitude: longitude != null ? Number(longitude) : null,
            });
          }
        }

        await Promise.all([
          c.del(cacheKeys.commerceDocument(documentHash)),
          c.del(cacheKeys.commerceOwner(req.user.id)),
          c.del(cacheKeys.commerceList()),
        ]);

        await updateUserById(req.user.id, {
          commerce_id: commerceData?.id,
          role: "OWNER",
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
        sendError(res, 500, "Error registering commerce");
      }
    },

    getById: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const { commerce_id } = req.params as { commerce_id: string };

        const c = await cache;

        const [commerce, queue] = await Promise.all([
          c.wrap(
            cacheKeys.commerceId(commerce_id),
            () => getCommerceById(commerce_id),
            cacheTTL.COMMERCE_ID
          ),
          c.wrap(
            cacheKeys.queueByCommerce(commerce_id),
            () => findQueueByCommerceId(commerce_id),
            cacheTTL.QUEUE_BY_COMMERCE
          ),
        ]);

        if (!commerce) return sendError(res, 404, "Commerce not found");

        const address = await getAddressByCommerceId(commerce_id);

        // Exclude the hashed document_id — it is not useful to clients and
        // should not be exposed in public responses.
        const { document_id: _doc, ...safeCommerce } = commerce;
        return res.code(200).send({
          ...safeCommerce,
          address: address ?? null,
          queue: queue ?? null,
        });
      } catch (error) {
        logger.error(`[Commerce Controller] - getById failed, error: ${error}`);
        return sendError(res, 500, "Failed to retrieve commerce");
      }
    },

    getAllCommerces: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const params = parsePaginationParams(
          req.query as Record<string, unknown>
        );

        const c = await cache;
        const cacheKey = `${cacheKeys.commerceList()}:${JSON.stringify(params)}`;

        const page = await c.wrap(
          cacheKey,
          () => listAllCommerces(params),
          cacheTTL.COMMERCE_LIST
        );

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
        return sendError(res, 500, "Failed to retrieve commerces");
      }
    },

    softDeleteCommerce: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id } = req.params as { commerce_id: string };

        if (!user) return sendError(res, 401, "Authentication required");

        const c = await cache;

        const commerce = await c.wrap(
          cacheKeys.commerceId(commerce_id),
          () => getCommerceById(commerce_id),
          cacheTTL.COMMERCE_ID
        );

        if (!commerce) return sendError(res, 404, "Commerce not found");

        if (commerce.owner_id !== user.id) {
          return sendError(
            res,
            403,
            "Only commerce owner can delete a commerce"
          );
        }

        await updateCommerceById(commerce_id, { active: false });

        await Promise.all([
          c.del(cacheKeys.commerceId(commerce_id)),
          c.del(cacheKeys.commerceList()),
          c.del(cacheKeys.commerceOwner(user.id)),
        ]);

        return res.code(200).send({ message: "Commerce deleted successfully" });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to delete commerce, error: ${error}`
        );
        return sendError(res, 500, "Failed to delete commerce");
      }
    },

    updateCommerce: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const body = req.body as Record<string, unknown>;
        const { commerce_id } = req.params as { commerce_id: string };
        req.log.debug(
          { commerce_id, body: req.body },
          "[Commerce] updateCommerce — received body"
        );

        if (!user) return sendError(res, 401, "Authentication required");

        const c = await cache;

        const commerce = await c.wrap(
          cacheKeys.commerceId(commerce_id),
          () => getCommerceById(commerce_id),
          cacheTTL.COMMERCE_ID
        );

        if (!commerce) return sendError(res, 404, "Commerce not found");

        if (commerce.owner_id !== user.id) {
          return sendError(
            res,
            403,
            "Only commerce owner can update a commerce"
          );
        }

        // Separate address fields from commerce core fields
        const {
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          cep,
          latitude,
          longitude,
          ...coreFields
        } = body;

        await updateCommerceById(commerce_id, coreFields);

        // Upsert address when any address field is present
        if (
          street !== undefined ||
          number !== undefined ||
          neighborhood !== undefined ||
          city !== undefined ||
          cep !== undefined ||
          latitude !== undefined ||
          longitude !== undefined
        ) {
          await upsertAddress(commerce_id, {
            street: (street as string) ?? null,
            number: (number as string) ?? null,
            complement: (complement as string) ?? null,
            neighborhood: (neighborhood as string) ?? null,
            city: (city as string) ?? null,
            state: (state as string) ?? null,
            cep: (cep as string) ?? null,
            latitude: latitude != null ? Number(latitude) : null,
            longitude: longitude != null ? Number(longitude) : null,
          });
        }

        await Promise.all([
          c.del(cacheKeys.commerceId(commerce_id)),
          c.del(cacheKeys.commerceList()),
        ]);

        return res.code(200).send({
          message: "Commerce updated successfully",
          data: { ...coreFields },
        });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to update commerce, error: ${error}`
        );
        return sendError(res, 500, "Failed to update commerce");
      }
    },

    grantAdmin: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id } = req.params as { commerce_id: string };
        const { email } = req.body as { email: string };

        if (!user) return sendError(res, 401, "Authentication required");

        const commerce = await getCommerceById(commerce_id);
        if (!commerce) return sendError(res, 404, "Commerce not found");
        if (commerce.owner_id !== user.id) {
          return sendError(res, 403, "Only the owner can grant admin access");
        }

        const person = await getUserByEmail(email);
        if (!person) return sendError(res, 404, "User not found");
        if (person.id === user.id) {
          return sendError(res, 400, "Owner cannot grant admin to themselves");
        }

        await grantCommerceAdmin(commerce_id, person.id, user.id);
        await updateUserById(person.id, { role: "ADMIN" });

        return res
          .code(200)
          .send({ message: `Admin access granted to ${person.email}` });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to grant admin, error: ${error}`
        );
        return sendError(res, 500, "Failed to grant admin access");
      }
    },

    revokeAdmin: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id, person_id } = req.params as {
          commerce_id: string;
          person_id: string;
        };

        if (!user) return sendError(res, 401, "Authentication required");

        const commerce = await getCommerceById(commerce_id);
        if (!commerce) return sendError(res, 404, "Commerce not found");
        if (commerce.owner_id !== user.id) {
          return sendError(res, 403, "Only the owner can revoke admin access");
        }

        await revokeCommerceAdmin(commerce_id, person_id);

        return res.code(200).send({ message: "Admin access revoked" });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to revoke admin, error: ${error}`
        );
        return sendError(res, 500, "Failed to revoke admin access");
      }
    },

    getNearbyQueues: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const { lat, lng, radius, cepPrefix } = req.query as Record<
          string,
          string
        >;
        req.log.debug(
          { query: req.query },
          "[Commerce] getNearbyQueues — params"
        );

        // CEP-prefix mode: faster, cacheable, no earth_distance math
        if (cepPrefix) {
          const digits = cepPrefix.replace(/\D/g, "");
          if (digits.length < 4 || digits.length > 8) {
            return sendError(res, 400, "cepPrefix must be 4–8 digits");
          }
          const results = await findNearbyOpenQueuesByCepPrefix(digits);
          return res.code(200).send(results);
        }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = radius ? parseInt(radius, 10) : 5000;

        if (isNaN(latNum) || isNaN(lngNum)) {
          return sendError(
            res,
            400,
            "Either cepPrefix or lat/lng are required"
          );
        }

        if (radiusNum > 50000) {
          return sendError(res, 400, "radius cannot exceed 50000 meters");
        }

        const results = await findNearbyOpenQueues(latNum, lngNum, radiusNum);
        return res.code(200).send(results);
      } catch (error) {
        logger.error(
          `[Commerce Controller] - getNearbyQueues failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to retrieve nearby queues");
      }
    },

    searchQueues: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const { cepPrefix, name } = req.query as Record<string, string>;

        if (!cepPrefix && !name) {
          return sendError(
            res,
            400,
            "At least one of cepPrefix or name is required"
          );
        }

        const digits = cepPrefix ? cepPrefix.replace(/\D/g, "") : undefined;
        if (digits && (digits.length < 4 || digits.length > 8)) {
          return sendError(res, 400, "cepPrefix must be 4–8 digits");
        }

        const results = await searchOpenQueues({ cepPrefix: digits, name });
        return res.code(200).send(results);
      } catch (error) {
        logger.error(
          `[Commerce Controller] - searchQueues failed, error: ${error}`
        );
        return sendError(res, 500, "Failed to search queues");
      }
    },

    listAdmins: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        const { commerce_id } = req.params as { commerce_id: string };

        if (!user) return sendError(res, 401, "Authentication required");

        const commerce = await getCommerceById(commerce_id);
        if (!commerce) return sendError(res, 404, "Commerce not found");
        if (commerce.owner_id !== user.id) {
          return sendError(res, 403, "Only the owner can list admins");
        }

        const admins = await listCommerceAdmins(commerce_id);
        return res.code(200).send({ data: admins });
      } catch (error) {
        logger.error(
          `[Commerce Controller] - Failed to list admins, error: ${error}`
        );
        return sendError(res, 500, "Failed to list admins");
      }
    },
  };
};

export default commerceController;
