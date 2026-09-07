import ROUTES from "../../constants";
import { rateLimits } from "../../utils/rateLimits";
import { dbCircuitBreaker } from "../../utils/circuit-breaker";
import { db } from "../database/connect";
import { isShuttingDown } from "../../utils/lifecycle";
import { Server, ServerRequest, ServerResponse } from "../types";
import { sql } from "kysely";

const registerHealthRoute = (server: Server) => {
  server.get(
    ROUTES.common.health,
    { config: { rateLimit: rateLimits.open } },
    async (_req: ServerRequest, res: ServerResponse) => {
      const circuitBreaker = dbCircuitBreaker.status;

      // Readiness probe do k8s. O probe roda SEMPRE, inclusive com o breaker
      // em OPEN: detectar que o banco voltou é exatamente a função dela.
      //
      // Pular o probe enquanto o breaker está aberto criava um deadlock: o
      // endpoint respondia 503, o k8s tirava o pod dos Endpoints do Service,
      // sem tráfego real `attempt()` nunca era chamado — e `attempt()` é o
      // único lugar que faz OPEN → HALF_OPEN. O pod ficava fora de rotação
      // permanentemente, mesmo depois do banco voltar.
      let dbStatus: { connected: boolean; latencyMs: number | null } = {
        connected: false,
        latencyMs: null,
      };

      const start = Date.now();
      try {
        await sql`select 1`.execute(db);
        dbStatus = { connected: true, latencyMs: Date.now() - start };
      } catch {
        dbStatus = { connected: false, latencyMs: null };
      }

      // Durante o dreno o pod deve sair do balanceamento mesmo com o banco OK.
      const isReady = dbStatus.connected && !isShuttingDown();
      return res.code(isReady ? 200 : 503).send({
        status: isReady ? "healthy" : "unhealthy",
        uptime: Math.floor(process.uptime()),
        circuitBreaker,
        database: dbStatus,
      });
    }
  );
  server.get(
    ROUTES.common.livez,
    { config: { rateLimit: rateLimits.open } },
    async (_req: ServerRequest, res: ServerResponse) =>
      res
        .code(200)
        .send({ status: "alive", uptime: Math.floor(process.uptime()) })
  );
};

export default registerHealthRoute;
