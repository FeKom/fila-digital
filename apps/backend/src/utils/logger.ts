import pino from "pino";
import config from "../infra/config";

export const logger = pino({
  level: config.get("logging.level") === "production" ? "info" : "debug",
  transport:
    config.get("logging.level") === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "dd/mm/yyyy HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
