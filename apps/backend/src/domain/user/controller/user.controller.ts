import { claimAnonymousParticipations } from "../../participants-queue/repository/participants-queue.repository";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import { randomBytes } from "crypto";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from "../../../utils/hash";
import * as userRepo from "../repository/user.repository";
import * as refreshTokenRepo from "../repository/refresh-token.repository";
import { LoginInput, RegisterInput } from "@fila-digital/types";
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "../../../utils/validate";
import { logger } from "../../../utils/logger";
import { uuidv7 } from "uuidv7";
import { sendError } from "../../../utils/errors";
import { signAccessToken } from "../../../utils/token";

const userController = () => {
  return {
    register: async (req: ServerRequest, res: ServerResponse) => {
      const user = req.body as RegisterInput;
      try {
        const [isValidName, isValidEmail, isValidPhone, isValidPassword] =
          await Promise.all([
            validateName(user.name),
            validateEmail(user.email),
            validatePhone(user.phone),
            validatePassword(user.password),
          ]);

        switch (true) {
          case !isValidPassword:
            sendError(
              res,
              400,
              "Invalid Password. Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character"
            );
            return;
          case isValidName === "":
            sendError(res, 400, "Invalid Name");
            return;
          case !isValidEmail:
            sendError(res, 400, "Invalid Email");
            return;
          case !isValidPhone:
            sendError(res, 400, "Invalid Phone");
            return;
        }
        if (await userRepo.emailExists(isValidEmail)) {
          sendError(res, 409, "User Already Exists");
          return;
        }
        const hasedPassword = await hashPassword(user.password);
        const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
        const response = await userRepo.createNewUser({
          id: anonymousId ?? uuidv7(),
          name: isValidName,
          phone: isValidPhone!,
          email: isValidEmail,
          password: hasedPassword,
        });
        if (!response) {
          sendError(res, 500, "Failed to create User!");
          return;
        }
        const access_token = signAccessToken(response);
        const rawRefreshToken = randomBytes(40).toString("hex");
        await refreshTokenRepo.saveRefreshToken(response.id, rawRefreshToken);
        res.code(201).send({
          message: "User Created!",
          access_token,
          refresh_token: rawRefreshToken,
        });
      } catch (error) {
        logger.error(
          `[User Controller] - something went wrong, error: ${error}`
        );
        sendError(res, 500, "Failed to create User!");
      }
    },
    login: async (req: ServerRequest, res: ServerResponse) => {
      const user = req.body as LoginInput;
      try {
        const userFromDb = await userRepo.findCredentialsByEmail(
          user.email.toLowerCase()
        );
        // Runs bcrypt even for unknown emails so both failures take as long.
        const valid = await verifyPassword(
          user.password,
          userFromDb?.password ?? DUMMY_PASSWORD_HASH
        );
        if (!userFromDb || !valid) {
          req.log.info(
            `[User Controller] - login failed: ${userFromDb ? "wrong password" : "unknown email"}`
          );
          sendError(res, 401, "Invalid credentials");
          return;
        }
        // Checked only after the password, so only the owner learns this.
        if (!userFromDb.active) {
          sendError(res, 403, "Account disabled");
          return;
        }

        const access_token = signAccessToken(userFromDb);
        const rawRefreshToken = randomBytes(40).toString("hex");
        await refreshTokenRepo.saveRefreshToken(userFromDb.id, rawRefreshToken);
        res.code(200).send({
          access_token,
          refresh_token: rawRefreshToken,
          message: "success",
        });
      } catch (error) {
        req.log.error(
          `[User Controller] - something went wrong, error: ${error}`
        );
        sendError(res, 500, "Login failed!");
      }
    },

    update: async (req: ServerRequest, res: ServerResponse) => {
      try {
        if (!req.user?.id) {
          sendError(res, 401, "Authentication required");
          return;
        }
        const { name, phone } = req.body as { name?: string; phone?: string };
        const updates: Record<string, unknown> = {};

        if (name) {
          const isValidName = validateName(name);
          if (!isValidName) {
            sendError(res, 400, "Invalid Name");
            return;
          }
          updates.name = isValidName;
        }

        if (phone) {
          const isValidPhone = validatePhone(phone);
          if (!isValidPhone) {
            sendError(res, 400, "Invalid Phone");
            return;
          }
          updates.phone = isValidPhone;
        }

        await userRepo.updateUserById(req.user.id, updates);
        return res.code(200).send({ message: "User updated successfully" });
      } catch (error) {
        logger.error(`[User Controller] - update failed: ${error}`);
        sendError(res, 500, "Failed to update user");
      }
    },

    delete: async (req: ServerRequest, res: ServerResponse) => {
      try {
        if (!req.user?.id) {
          sendError(res, 401, "Authentication required");
          return;
        }
        await userRepo.softDeleteUserById(req.user.id);
        return res.code(200).send({ message: "User deleted successfully" });
      } catch (error) {
        logger.error(`[User Controller] - delete failed: ${error}`);
        sendError(res, 500, "Failed to delete user");
      }
    },

    refresh: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const { refresh_token } = req.body as { refresh_token?: string };
        if (!refresh_token) {
          sendError(res, 400, "refresh_token is required");
          return;
        }
        const stored = await refreshTokenRepo.findRefreshToken(refresh_token);
        if (!stored) {
          sendError(res, 401, "Invalid or expired refresh token");
          return;
        }
        const person = await userRepo.findUserById(stored.person_id);
        if (!person || !person.active) {
          sendError(res, 401, "User not found or inactive");
          return;
        }
        // Rotate: delete old, issue new
        await refreshTokenRepo.deleteRefreshToken(refresh_token);
        const newRawToken = randomBytes(40).toString("hex");
        await refreshTokenRepo.saveRefreshToken(person.id, newRawToken);
        const access_token = signAccessToken(person);
        return res.code(200).send({
          access_token,
          refresh_token: newRawToken,
          message: "success",
        });
      } catch (error) {
        logger.error(`[User Controller] - refresh failed: ${error}`);
        sendError(res, 500, "Token refresh failed");
      }
    },

    claimAnonymous: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        if (!user) return sendError(res, 401, "Authentication required");

        const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
        if (!anonymousId)
          return sendError(res, 400, "X-Anonymous-Id header is required");

        await claimAnonymousParticipations(anonymousId, user.id);
        return res
          .code(200)
          .send({ message: "Anonymous participations claimed" });
      } catch (error) {
        logger.error(`[User Controller] - claimAnonymous failed: ${error}`);
        return sendError(res, 500, "Failed to claim anonymous participations");
      }
    },

    logout: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const { refresh_token } = req.body as { refresh_token?: string };
        if (refresh_token) {
          await refreshTokenRepo.deleteRefreshToken(refresh_token);
        }
        return res.code(200).send({ message: "Logged out successfully" });
      } catch (error) {
        logger.error(`[User Controller] - logout failed: ${error}`);
        sendError(res, 500, "Logout failed");
      }
    },
  };
};

export default userController;
