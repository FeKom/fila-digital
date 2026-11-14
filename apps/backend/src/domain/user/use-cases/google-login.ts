import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "crypto";
import { uuidv7 } from "uuidv7";
import { db } from "../../../infra/database/connect";
import * as refreshTokenRepo from "../repository/refresh-token.repository";
import config from "../../../infra/config";
import { ServerRequest, ServerResponse } from "../../../infra/types";
import { sendError } from "../../../utils/errors";
import { signAccessToken } from "../../../utils/token";

const client = new OAuth2Client(config.get<string>("google.clientId"));

const googleLogin = () => ({
  handle: async (req: ServerRequest, res: ServerResponse) => {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      sendError(res, 400, "idToken is required");
      return;
    }

    try {
      // 1. Verify the token with Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: config.get<string>("google.clientId"),
      });

      const payload = ticket.getPayload();
      if (!payload?.email) {
        sendError(res, 401, "Invalid Google token");
        return;
      }

      const { sub: googleId, email, name = "" } = payload;

      // 2. Find existing user by google_id or email
      let person = await db
        .selectFrom("person")
        .selectAll()
        .where((eb) =>
          eb.or([eb("google_id", "=", googleId), eb("email", "=", email)])
        )
        .executeTakeFirst();

      // 3. Create user if not found
      if (!person) {
        person = await db
          .insertInto("person")
          .values({
            id: uuidv7(),
            name,
            email,
            google_id: googleId,
            password: "",
            phone: "",
            role: "CUSTOMER",
            active: true,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      }

      // Google already proved who this is, so the specific message is safe.
      if (!person.active) {
        sendError(res, 403, "Account disabled");
        return;
      }

      // 4. Link google_id if user signed up via email but never used Google
      if (!person.google_id) {
        await db
          .updateTable("person")
          .set({ google_id: googleId })
          .where("id", "=", person.id)
          .execute();
      }

      // 5. Return same JWT pair as email/password login
      const access_token = signAccessToken(person);
      const rawRefreshToken = randomBytes(40).toString("hex");
      await refreshTokenRepo.saveRefreshToken(person.id, rawRefreshToken);

      return res.code(200).send({
        access_token,
        refresh_token: rawRefreshToken,
        message: "success",
      });
    } catch (error) {
      req.log.error(`[Google Login] - failed: ${String(error)}`);
      sendError(res, 401, `Google authentication failed: ${String(error)}`);
    }
  },
});

export default googleLogin;
