import webpush from "web-push";
import config from "./config";
import { logger } from "../utils/logger";

const vapidConf = config.get<{
  subject: string;
  publicKey: string;
  privateKey: string;
}>("vapid");

let initialized = false;

export function initWebPush() {
  if (!vapidConf.publicKey || !vapidConf.privateKey || !vapidConf.subject) {
    logger.warn(
      "[Push] VAPID keys not configured — push notifications disabled"
    );
    return;
  }
  webpush.setVapidDetails(
    vapidConf.subject,
    vapidConf.publicKey,
    vapidConf.privateKey
  );
  initialized = true;
  logger.info("[Push] Web Push initialized");
}

export function isPushInitialized() {
  return initialized;
}

export async function sendWebPush(
  subscription: { endpoint: string; auth: string; p256dh: string },
  payload: object
): Promise<void> {
  if (!initialized) return;
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { auth: subscription.auth, p256dh: subscription.p256dh },
    },
    JSON.stringify(payload)
  );
}
