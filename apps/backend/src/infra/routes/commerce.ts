import commerceController from "../../domain/commerce/controller/commerce.controller";
import ROUTES from "../../constants";
import { rateLimits } from "../../utils/rateLimits";
import {
  registerCommerceSchema,
  listCommercesSchema,
  updateCommerceSchema,
  deleteCommerceSchema,
  nearbyQueuesSchema,
  searchQueuesSchema,
} from "../schemas/commerce.schema";
import { Server } from "../types";

const registerCommerceRoutes = (server: Server) => {
  const controller = commerceController();

  server.get(
    ROUTES.commerce.nearby,
    { schema: nearbyQueuesSchema, config: { rateLimit: rateLimits.read } },
    controller.getNearbyQueues
  );
  server.get(
    ROUTES.commerce.searchQueues,
    { schema: searchQueuesSchema, config: { rateLimit: rateLimits.read } },
    controller.searchQueues
  );
  server.post(
    ROUTES.commerce.register,
    { schema: registerCommerceSchema, config: { rateLimit: rateLimits.write } },
    controller.register
  );
  server.get(
    ROUTES.commerce.list,
    { schema: listCommercesSchema, config: { rateLimit: rateLimits.read } },
    controller.getAllCommerces
  );
  server.get(
    ROUTES.commerce.getById,
    { config: { rateLimit: rateLimits.read } },
    controller.getById
  );
  server.put(
    ROUTES.commerce.update,
    { schema: updateCommerceSchema, config: { rateLimit: rateLimits.write } },
    controller.updateCommerce
  );
  server.delete(
    ROUTES.commerce.delete,
    { schema: deleteCommerceSchema, config: { rateLimit: rateLimits.write } },
    controller.softDeleteCommerce
  );
  server.post(
    ROUTES.commerce.grantAdmin,
    { config: { rateLimit: rateLimits.write } },
    controller.grantAdmin
  );
  server.delete(
    ROUTES.commerce.revokeAdmin,
    { config: { rateLimit: rateLimits.write } },
    controller.revokeAdmin
  );
  server.get(
    ROUTES.commerce.listAdmins,
    { config: { rateLimit: rateLimits.read } },
    controller.listAdmins
  );
};

export default registerCommerceRoutes;
