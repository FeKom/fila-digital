import { ServerRequest, ServerResponse } from "../infra/types";
import { sendError } from "./errors";
import { PersonRole } from "../infra/database/types";

export const requireRole = (
  req: ServerRequest,
  res: ServerResponse,
  ...roles: PersonRole[]
): boolean => {
  if (!req.user?.id) {
    sendError(res, 401, "Authentication required");
    return false;
  }
  if (req.user.role && !roles.includes(req.user.role)) {
    sendError(res, 403, "Insufficient permissions");
    return false;
  }
  return true;
};
