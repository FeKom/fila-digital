import commerceController from "../../domain/commerce/controller/commerce.controller";
import ROUTES from "../../constants";
import { rateLimits } from "../../utils/rateLimits";
import {
  registerCommerceSchema,
  listCommercesSchema,
  updateCommerceSchema,
  deleteCommerceSchema,
} from "../schemas/commerce.schema";
import { Server } from "../types";

const registerCommerceRoutes = (server: Server) => {
  const controller = commerceController();

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
};

export default registerCommerceRoutes;
