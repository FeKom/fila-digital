import pino from "pino";
import config from "../infra/config";

const lokiUrl = process.env.LOKI_URL;

const targets: pino.TransportTargetOptions[] = [];

targets.push({
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "dd/mm/yyyy HH:MM:ss",
    ignore: "pid,hostname",
  },
});

if (lokiUrl) {
  targets.push({
    target: "pino-loki",
    options: {
      host: lokiUrl,
      labels: {
        app: "fila-digital-api",
        env: process.env.NODE_ENV ?? "development",
      },
      interval: 1,
      silenceErrors: true,
    },
  });
}

export const logger = pino({
  level: config.get("logging.level") === "production" ? "info" : "debug",
  transport: { targets },
});
