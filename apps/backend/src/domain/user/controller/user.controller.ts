import { Person } from "../../../infra/database/types";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "../../../utils/hash";
import * as userRepo from "../repository/user.repository";
import * as refreshTokenRepo from "../repository/refresh-token.repository";
import config from "../../../infra/config";
import { User } from "../type";
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "../../../utils/validate";
import { logger } from "../../../utils/logger";
import { uuidv7 } from "uuidv7";
import { sendError } from "../../../utils/errors";

const ACCESS_TOKEN_TTL = 60 * 15; // 15 minutes

const signAccessToken = (user: {
  id: string;
  name: string;
  email: string;
  role: string;
}): string =>
  jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    config.get<string>("token.secret"),
    { expiresIn: ACCESS_TOKEN_TTL }
  );

const userController = () => {
  return {
    register: async (req: ServerRequest, res: ServerResponse) => {
      const user = req.body as User;
      try {
        const isValidPassword = validatePassword(user.password);
        if (!isValidPassword) {
          sendError(
            res,
            400,
            "Invalid Password. Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character"
          );
          return;
        }
        const isValidName = validateName(user.name);
        if (!isValidName) {
          sendError(res, 400, "Invalid Name");
          return;
        }
        const isValidEmail = validateEmail(user.email);
        if (!isValidEmail) {
          sendError(res, 400, "Invalid Email");
          return;
        }
        const isValidPhone = validatePhone(user.phone);
        if (!isValidPhone) {
          sendError(res, 400, "Invalid Phone");
          return;
        }
        const userFromDb = await userRepo.getUserByEmail(isValidEmail);

        if (userFromDb) {
          if (
            userFromDb.email === isValidEmail ||
            userFromDb.phone === isValidPhone
          ) {
            sendError(res, 409, "User Already Exists");
            return;
          }
        }
        const hasedPassword = await hashPassword(user.password);
        const response = await userRepo.createNewUser({
          ...user,
          id: uuidv7(),
          phone: isValidPhone!,
          email: isValidEmail,
          password: hasedPassword,
        });
        if (response) {
          const access_token = signAccessToken(response);
          const rawRefreshToken = randomBytes(40).toString("hex");
          await refreshTokenRepo.saveRefreshToken(response.id, rawRefreshToken);
          res.code(201).send({
            message: "User Created!",
            access_token,
            refresh_token: rawRefreshToken,
          });
        }
      } catch (error) {
        logger.error(
          `[User Controller] - something went wrong, error: ${error}`
        );
        sendError(res, 500, "Failed to create User!");
      }
    },
    login: async (req: ServerRequest, res: ServerResponse) => {
      const user = req.body as Person;
      try {
        const userFromDb = await userRepo.getUserByEmail(
          user.email.toLowerCase()
        );
        if (!userFromDb) {
          sendError(res, 404, "User Not Found");
          return;
        }
        const valid = await verifyPassword(user.password, userFromDb.password);

        if (valid) {
          const access_token = signAccessToken(userFromDb);
          const rawRefreshToken = randomBytes(40).toString("hex");
          await refreshTokenRepo.saveRefreshToken(
            userFromDb.id,
            rawRefreshToken
          );
          res.code(200).send({
            access_token,
            refresh_token: rawRefreshToken,
            message: "success",
          });
        } else {
          sendError(res, 403, "Invalid credentials");
        }
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
