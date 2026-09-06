import pino from "pino";
import config from "../infra/config";

const lokiUrl = process.env.LOKI_URL;
const isProduction = process.env.NODE_ENV === "production";

const targets: pino.TransportTargetOptions[] = [];

// pino-pretty é devDependency e formata para leitura humana. Em produção a
// imagem roda com node_modules podado (ele não existe lá) e o que queremos é
// JSON estruturado direto no stdout — que é o formato que Loki e k8s consomem.
if (!isProduction) {
  targets.push({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "dd/mm/yyyy HH:MM:ss",
      ignore: "pid,hostname",
    },
  });
}

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
  // Sem targets (produção sem LOKI_URL) o pino escreve JSON no stdout, que é
  // exatamente o desejado. Passar `targets: []` seria um erro em runtime.
  ...(targets.length > 0 ? { transport: { targets } } : {}),
});
