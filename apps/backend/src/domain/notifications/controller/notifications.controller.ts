import { ServerRequest, ServerResponse } from "../../../infra/types";
import { sendError } from "../../../utils/errors";
import { upsertPushSubscription } from "../repository/notifications.repository";

const notificationsController = () => ({
  subscribe: async (req: ServerRequest, res: ServerResponse) => {
    try {
      const { subscription } = req.body as {
        subscription: {
          endpoint: string;
          keys: { auth: string; p256dh: string };
        };
      };

      const personId = req.user?.id ?? null;
      const anonymousId =
        (req.headers["x-anonymous-id"] as string | undefined) ?? null;

      if (!personId && !anonymousId) {
        return sendError(res, 400, "Authentication or anonymousId required");
      }

      await upsertPushSubscription({
        personId,
        anonymousId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      });

      return res.code(201).send({ message: "Push subscription saved" });
    } catch (error) {
      req.log.error(`[Notifications] subscribe failed: ${error}`);
      return sendError(res, 500, "Failed to save push subscription");
    }
  },
});

export default notificationsController;
