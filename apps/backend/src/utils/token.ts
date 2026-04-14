import jwt from "jsonwebtoken";
import config from "../infra/config";
import { ServerRequest, ServerResponse } from "../infra/types";
import { User } from "../domain/user/type";

export const verifyToken = (
  request: ServerRequest,
  response: ServerResponse
) => {
  const authHeader = request.headers.authorization
    ?.replace("Bearer", "")
    .trim();
  const JWT_SECRET = config.get<string>("token.secret");

  if (!authHeader) {
    return response.code(401).send({ message: "Not Authorized" });
  }
  try {
    const decoded = jwt.verify(authHeader, JWT_SECRET) as User;
    request.user = decoded;
    return decoded;
  } catch (error) {
    return response.code(401).send({ message: "Token Unauthorized" });
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
