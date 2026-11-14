import jwt from "jsonwebtoken";
import config from "../infra/config";
import { ServerRequest, ServerResponse, TokenPayload } from "../infra/types";
import { Person } from "../infra/database/types";
import { sendError } from "./errors";

const ACCESS_TOKEN_TTL = 60 * 15; // 15 minutes
const JWT_SECRET = config.get<string>("token.secret");

export const signAccessToken = (
  user: Pick<Person, "id" | "name" | "email" | "role">
): string => {
  const payload: TokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

export const parseToken = (token: string): TokenPayload | undefined => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return undefined;
  }
};

export const verifyToken = (
  request: ServerRequest,
  response: ServerResponse
) => {
  const token = request.headers.authorization?.replace("Bearer", "").trim();
  if (!token) {
    sendError(response, 401, "Authentication required");
    return;
  }

  const payload = parseToken(token);
  if (!payload) {
    sendError(response, 401, "Invalid or expired token");
    return;
  }
  request.user = payload;
  return payload;
};
