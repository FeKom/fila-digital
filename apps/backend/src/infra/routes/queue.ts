import ROUTES from "../../constants";
import queueController from "../../domain/queue/controller/queue.controller";
import { rateLimits } from "../../utils/rateLimits";
import {
  registerQueueSchema,
  updateQueueSchema,
  deleteQueueSchema,
  createScheduleSchema,
  getScheduleSchema,
  toggleScheduleSchema,
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
  server.post(
    ROUTES.queue.schedule,
    { schema: createScheduleSchema, config: { rateLimit: rateLimits.write } },
    controller.createSchedule
  );
  server.get(
    ROUTES.queue.schedule,
    { schema: getScheduleSchema, config: { rateLimit: rateLimits.read } },
    controller.getSchedule
  );
  server.patch(
    ROUTES.queue.scheduleToggle,
    { schema: toggleScheduleSchema, config: { rateLimit: rateLimits.write } },
    controller.toggleSchedule
  );
};

export default registerQueueRoutes;
