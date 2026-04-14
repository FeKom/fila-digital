import { Person } from "../../../infra/database/types";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import jwt from "jsonwebtoken";
import { hashPassword, verifyPassword } from "../../../utils/hash";
import * as userRepo from "../repository/user.repository";
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
          const dayInSeconds = 60 * 60 * 24;
          const token = jwt.sign(
            { name: response.name, email: response.email, id: response.id },
            config.get<string>("token.secret"),
            { expiresIn: dayInSeconds }
          );
          res.code(201).send({ message: "User Created!", token });
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
          const dayInSeconds = 60 * 60 * 24;
          const token = jwt.sign(
            {
              name: userFromDb.name,
              email: userFromDb.email,
              id: userFromDb.id,
            },
            config.get<string>("token.secret"),
            { expiresIn: dayInSeconds }
          );
          res.code(200).send({ token, message: "success" });
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
  };
};

export default userController;
