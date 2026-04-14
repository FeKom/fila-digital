import ROUTES from "../../constants";
import queueController from "../../domain/queue/controller/queue.controller";
import { rateLimits } from "../../utils/rateLimits";
import {
  registerQueueSchema,
  updateQueueSchema,
  deleteQueueSchema,
} from "../schemas/queue.schema";
import { Server } from "../types";

const registerQueueRoutes = (server: Server) => {
  const controller = queueController();

  server.post(
    ROUTES.queue.register,
    { schema: registerQueueSchema, config: { rateLimit: rateLimits.write } },
    controller.register
  );
  server.put(
    ROUTES.queue.update,
    { schema: updateQueueSchema, config: { rateLimit: rateLimits.write } },
    controller.update
  );
  server.delete(
    ROUTES.queue.delete,
    { schema: deleteQueueSchema, config: { rateLimit: rateLimits.write } },
    controller.softDeleteQueue
  );
};

export default registerQueueRoutes;
