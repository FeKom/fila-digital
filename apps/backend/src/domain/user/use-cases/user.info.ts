import { ServerRequest, ServerResponse } from "../../../infra/types";
import { findCommerceIdByUserId } from "../../commerce/repository/commerce.repository";
import { findUserQueuesByUserID } from "../../participants-queue/repository/participants-queue.repository";
import { findUserById } from "../repository/user.repository";

const userInfo = () => {
  return {
    getUserInfo: async (req: ServerRequest, res: ServerResponse) => {
      const user = req.user?.id;
      try {
        if (user) {
          const userFromDb = await findUserById(user);
          if (userFromDb) {
            res.code(200).send({
              name: userFromDb?.name,
              email: userFromDb?.email,
              phone: userFromDb?.phone,
            });
            return;
          }
        }
      } catch (error) {
        if (error) {
          req.log.error(
            `[User Get Info] - Something went wrong, error: ${error}`
          );
        }
        res.code(500).send({
          message: "Error for get User Info",
        });
      }
    },
    getUserCommerces: async (req: ServerRequest, res: ServerResponse) => {
      const user = req.user;
      if (user) {
        const userFromDb = await findUserById(user.id);
        let commercesFromUser;
        if (userFromDb?.id) {
          commercesFromUser = await findCommerceIdByUserId(userFromDb.id);
        }
        res.code(200).send({
          commerces: commercesFromUser,
        });
      }
    },
    listUserQueues: async (req: ServerRequest, res: ServerResponse) => {
      try {
        const user = req.user;
        if (user) {
          const userQueues = await findUserQueuesByUserID(user.id);
          return res.code(200).send({
            message: "All users queues",
            data: {
              userQueues,
            },
          });
        }
      } catch (error) {
        req.log.error(
          `[Queue Controller] - Failed to get user queues, error: ${error}`
        );
        return res.code(500).send({
          message: "Failed to retrieve user queues",
        });
      }
    },
  };
};

export default userInfo;
