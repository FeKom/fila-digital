import { uuidv7 } from "uuidv7";
import { db } from "../../../infra/database/connect";
import { NewRefreshToken } from "../../../infra/database/types";
import { hashToken } from "../../../utils/tokenHash";

const REFRESH_TOKEN_TTL_DAYS = 30;

export const saveRefreshToken = async (
  personId: string,
  rawToken: string
): Promise<void> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  const record: NewRefreshToken = {
    id: uuidv7(),
    person_id: personId,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt.toISOString(),
  };

  await db.insertInto("refresh_tokens").values(record).execute();
};

export const findRefreshToken = async (rawToken: string) => {
  return db
    .selectFrom("refresh_tokens")
    .selectAll()
    .where("token_hash", "=", hashToken(rawToken))
    .where("expires_at", ">", new Date())
    .executeTakeFirst();
};

export const deleteRefreshToken = async (rawToken: string): Promise<void> => {
  await db
    .deleteFrom("refresh_tokens")
    .where("token_hash", "=", hashToken(rawToken))
    .execute();
};

export const deleteAllRefreshTokensForPerson = async (
  personId: string
): Promise<void> => {
  await db
    .deleteFrom("refresh_tokens")
    .where("person_id", "=", personId)
    .execute();
};
