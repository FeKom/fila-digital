import { ServerRequest, ServerResponse } from "../../../infra/types";
import { findCommerceIdByUserId } from "../../commerce/repository/commerce.repository";
import { findUserQueuesByUserID } from "../../participants-queue/repository/participants-queue.repository";
import { findUserById } from "../repository/user.repository";
import { sendError } from "../../../utils/errors";

const userInfo = () => {
  return {
    getUserInfo: async (req: ServerRequest, res: ServerResponse) => {
      if (!req.user?.id) {
        sendError(res, 401, "Authentication required");
        return;
      }
      try {
        const userFromDb = await findUserById(req.user.id);
        if (!userFromDb) {
          sendError(res, 404, "User not found");
          return;
        }
        return res.code(200).send({
          name: userFromDb.name,
          email: userFromDb.email,
          phone: userFromDb.phone,
        });
      } catch (error) {
        req.log.error(
          `[User Get Info] - Something went wrong, error: ${error}`
        );
        sendError(res, 500, "Error fetching user info");
      }
    },

    getUserCommerces: async (req: ServerRequest, res: ServerResponse) => {
      if (!req.user?.id) {
        sendError(res, 401, "Authentication required");
        return;
      }
      try {
        const commerces = await findCommerceIdByUserId(req.user.id);
        return res.code(200).send({
          commerces: commerces.map(
            ({ id, name, description, phone, open_at, closed_at, active }) => ({
              id,
              name,
              description,
              phone,
              open_at,
              closed_at,
              active,
            })
          ),
        });
      } catch (error) {
        req.log.error(
          `[User Commerces] - Something went wrong, error: ${error}`
        );
        sendError(res, 500, "Failed to retrieve commerces");
      }
    },

    listUserQueues: async (req: ServerRequest, res: ServerResponse) => {
      if (!req.user?.id) {
        sendError(res, 401, "Authentication required");
        return;
      }
      try {
        const userQueues = await findUserQueuesByUserID(req.user.id);
        return res.code(200).send({
          message: "All users queues",
          data: { userQueues },
        });
      } catch (error) {
        req.log.error(
          `[Queue Controller] - Failed to get user queues, error: ${error}`
        );
        sendError(res, 500, "Failed to retrieve user queues");
      }
    },
  };
};

export default userInfo;
