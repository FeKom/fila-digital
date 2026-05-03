import ROUTES from "../../constants";
import userController from "../../domain/user/controller/user.controller";
import userInfo from "../../domain/user/use-cases/user.info";
import googleLogin from "../../domain/user/use-cases/google-login";
import { rateLimits } from "../../utils/rateLimits";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  updateUserSchema,
  deleteUserSchema,
} from "../schemas/user.schema";
import { Server } from "../types";

const registerUserRoutes = (server: Server) => {
  const controller = userController();
  const useCase = userInfo();
  const googleLoginUseCase = googleLogin();

  server.post(
    ROUTES.user.google,
    { config: { rateLimit: rateLimits.auth } },
    googleLoginUseCase.handle
  );
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
  server.post(
    ROUTES.user.refresh,
    { schema: refreshTokenSchema, config: { rateLimit: rateLimits.auth } },
    controller.refresh
  );
  server.post(
    ROUTES.user.logout,
    { schema: logoutSchema, config: { rateLimit: rateLimits.auth } },
    controller.logout
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
  server.put(
    ROUTES.user.update,
    { schema: updateUserSchema, config: { rateLimit: rateLimits.write } },
    controller.update
  );
  server.delete(
    ROUTES.user.delete,
    { schema: deleteUserSchema, config: { rateLimit: rateLimits.write } },
    controller.delete
  );
};

export default registerUserRoutes;
