import notificationsController from "../../domain/notifications/controller/notifications.controller";
import { subscribePushSchema } from "../schemas/notifications.schema";
import { rateLimits } from "../../utils/rateLimits";
import { Server } from "../types";

const registerNotificationsRoutes = (server: Server) => {
  const controller = notificationsController();

  server.post(
    "/notifications/subscribe",
    { schema: subscribePushSchema, config: { rateLimit: rateLimits.write } },
    controller.subscribe
  );
};

export default registerNotificationsRoutes;
