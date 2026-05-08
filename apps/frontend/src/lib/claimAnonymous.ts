import { getAnonymousId, clearAnonymousId } from "./anonymousId";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

/**
 * After a user logs in or registers, transfer any queue positions they
 * entered as anonymous to their new account, then clear the local ID.
 */
export const claimAnonymous = async (): Promise<void> => {
  const anonymousId = getAnonymousId();
  try {
    await fetch(`${BASE_URL}/v1/user/claim-anonymous`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Anonymous-Id": anonymousId,
      },
      credentials: "include", // sends the session cookie set by the server action
    });
    clearAnonymousId();
  } catch {
    // non-critical — user is logged in regardless
  }
};
