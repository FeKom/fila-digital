import { db } from "../../../infra/database/connect";
import { sendWebPush } from "../../../infra/push";
import { logger } from "../../../utils/logger";

export const upsertPushSubscription = async (data: {
  personId: string | null;
  anonymousId: string | null;
  endpoint: string;
  auth: string;
  p256dh: string;
}) => {
  await db
    .insertInto("push_subscriptions")
    .values({
      person_id: data.personId,
      anonymous_id: data.anonymousId,
      endpoint: data.endpoint,
      auth: data.auth,
      p256dh: data.p256dh,
    })
    .onConflict((oc) =>
      oc.column("endpoint").doUpdateSet({
        person_id: data.personId,
        anonymous_id: data.anonymousId,
        auth: data.auth,
        p256dh: data.p256dh,
      })
    )
    .execute();
};

const findByPerson = (personId: string) =>
  db
    .selectFrom("push_subscriptions")
    .select(["endpoint", "auth", "p256dh"])
    .where("person_id", "=", personId)
    .executeTakeFirst();

const findByAnon = (anonymousId: string) =>
  db
    .selectFrom("push_subscriptions")
    .select(["endpoint", "auth", "p256dh"])
    .where("anonymous_id", "=", anonymousId)
    .executeTakeFirst();

const deleteByEndpoint = (endpoint: string) =>
  db
    .deleteFrom("push_subscriptions")
    .where("endpoint", "=", endpoint)
    .execute();

/**
 * Fire-and-forget: finds the participant's push subscription and sends
 * a "you're next" notification. Deletes the subscription if it has expired.
 * Never throws — caller does not await.
 */
export const notifyParticipantCalled = async (
  personId: string | null,
  anonymousId: string | null,
  commerceName: string
): Promise<void> => {
  try {
    const sub = personId
      ? await findByPerson(personId)
      : anonymousId
        ? await findByAnon(anonymousId)
        : null;

    if (!sub) return;

    await sendWebPush(sub, {
      title: "É a sua vez!",
      body: `Dirija-se ao ${commerceName}`,
      url: "/minhas-filas",
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      // Subscription expired — clean up
      const sub = personId
        ? await findByPerson(personId)
        : anonymousId
          ? await findByAnon(anonymousId)
          : null;
      if (sub) await deleteByEndpoint(sub.endpoint);
    } else {
      logger.warn(`[Push] Failed to send notification: ${err}`);
    }
  }
};
