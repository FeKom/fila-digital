import jwt from "jsonwebtoken";
import config from "../infra/config";
import { ServerRequest, ServerResponse } from "../infra/types";
import { User } from "../domain/user/type";
import { sendError } from "./errors";

export const verifyToken = (
  request: ServerRequest,
  response: ServerResponse
) => {
  const authHeader = request.headers.authorization
    ?.replace("Bearer", "")
    .trim();
  const JWT_SECRET = config.get<string>("token.secret");

  if (!authHeader) {
    sendError(response, 401, "Authentication required");
    return;
  }
  try {
    const decoded = jwt.verify(authHeader, JWT_SECRET) as User;
    request.user = decoded;
    return decoded;
  } catch {
    sendError(response, 401, "Invalid or expired token");
  }
};

export const decodeToken = <T>(authorizationHeader: string | undefined) => {
  let token = undefined;
  const JWT_SECRET = config.get<string>("token.secret");
  if (authorizationHeader) {
    token = authorizationHeader.replace("Bearer", "").trim();
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as T;
  }
  return token;
};
