import ROUTES from "../../constants";
import queueParticipantsController from "../../domain/participants-queue/controller/participants-queue.controller";
import { rateLimits } from "../../utils/rateLimits";
import {
  listByCommerceSchema,
  enterQueueSchema,
  enterByQrCodeSchema,
  getMyPositionSchema,
  removeFirstSchema,
  removeNextNSchema,
  revertSchema,
  exitQueueSchema,
} from "../schemas/participants-queue.schema";
import { Server } from "../types";

const registerUserRoutes = (server: Server) => {
  const controller = queueParticipantsController();

  server.get(
    ROUTES.participantsQueue.list,
    { schema: listByCommerceSchema, config: { rateLimit: rateLimits.read } },
    controller.listByCommerce
  );
  server.post(
    ROUTES.participantsQueue.enter,
    { schema: enterQueueSchema, config: { rateLimit: rateLimits.write } },
    controller.enter
  );
  server.delete(
    ROUTES.participantsQueue.next,
    { schema: removeFirstSchema, config: { rateLimit: rateLimits.write } },
    controller.removeFirst
  );
  server.delete(
    ROUTES.participantsQueue.nextN,
    { schema: removeNextNSchema, config: { rateLimit: rateLimits.write } },
    controller.removeNextN
  );
  server.delete(
    ROUTES.participantsQueue.exit,
    { schema: exitQueueSchema, config: { rateLimit: rateLimits.write } },
    controller.exiteQueue
  );
  server.get(
    ROUTES.participantsQueue.myPosition,
    { schema: getMyPositionSchema, config: { rateLimit: rateLimits.read } },
    controller.getMyPosition
  );
  // SSE — no JSON schema (streams), rate-limited as read
  server.get(
    ROUTES.participantsQueue.stream,
    { config: { rateLimit: rateLimits.read } },
    controller.streamPosition
  );
  server.put(
    ROUTES.participantsQueue.revert,
    { schema: revertSchema, config: { rateLimit: rateLimits.write } },
    controller.revertLast
  );
  server.put(
    ROUTES.participantsQueue.revertN,
    { schema: revertSchema, config: { rateLimit: rateLimits.write } },
    controller.revertLast
  );
  server.post(
    ROUTES.participantsQueue.enterByQrCode,
    {
      schema: enterByQrCodeSchema,
      config: { rateLimit: rateLimits.write },
    },
    controller.enterByQrCode
  );
};

export default registerUserRoutes;
