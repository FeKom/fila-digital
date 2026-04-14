import ROUTES from "../../constants";
import userController from "../../domain/user/controller/user.controller";
import userInfo from "../../domain/user/use-cases/user.info";
import { rateLimits } from "../../utils/rateLimits";
import { registerSchema, loginSchema } from "../schemas/user.schema";
import { Server } from "../types";

const registerUserRoutes = (server: Server) => {
  const controller = userController();
  const useCase = userInfo();

  server.post(
    ROUTES.user.register,
    { schema: registerSchema, config: { rateLimit: rateLimits.auth } },
    controller.register
  );
  server.post(
    ROUTES.user.login,
    { schema: loginSchema, config: { rateLimit: rateLimits.auth } },
    controller.login
  );
  server.get(
    ROUTES.user.details,
    { config: { rateLimit: rateLimits.read } },
    useCase.getUserInfo
  );
  server.get(
    ROUTES.user.commerces,
    { config: { rateLimit: rateLimits.read } },
    useCase.getUserCommerces
  );
  server.get(
    ROUTES.user.queues,
    { config: { rateLimit: rateLimits.read } },
    useCase.listUserQueues
  );
};

export default registerUserRoutes;
