import { ServerRequest, ServerResponse } from "../infra/types";
import { sendError } from "./errors";
import { UserRole } from "../domain/user/type";

export const requireRole = (
  req: ServerRequest,
  res: ServerResponse,
  ...roles: UserRole[]
): boolean => {
  if (!req.user?.id) {
    sendError(res, 401, "Authentication required");
    return false;
  }
  if (req.user.role && !roles.includes(req.user.role as UserRole)) {
    sendError(res, 403, "Insufficient permissions");
    return false;
  }
  return true;
};
