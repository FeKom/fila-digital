import { ServerResponse } from "../infra/types";

const HTTP_STATUS_NAMES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export const sendError = (
  res: ServerResponse,
  statusCode: number,
  message: string
): void => {
  res.code(statusCode).send({
    statusCode,
    error: HTTP_STATUS_NAMES[statusCode] ?? "Error",
    message,
  });
};
