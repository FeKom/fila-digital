import ROUTES from "../../constants";
import { rateLimits } from "../../utils/rateLimits";
import { dbCircuitBreaker } from "../../utils/circuit-breaker";
import { db } from "../database/connect";
import { Server, ServerRequest, ServerResponse } from "../types";

const registerHealthRoute = (server: Server) => {
  server.get(
    ROUTES.common.health,
    { config: { rateLimit: rateLimits.open } },
    async (_req: ServerRequest, res: ServerResponse) => {
      const circuitBreaker = dbCircuitBreaker.status;

      // Measure DB round-trip latency with a lightweight SELECT 1.
      // If the circuit is OPEN we skip the probe — the DB is known to be down.
      let dbStatus: { connected: boolean; latencyMs: number | null } = {
        connected: false,
        latencyMs: null,
      };

      if (circuitBreaker.state !== "OPEN") {
        const start = Date.now();
        try {
          await db.selectFrom("commerce").select("id").limit(1).execute();
          dbStatus = { connected: true, latencyMs: Date.now() - start };
        } catch {
          dbStatus = { connected: false, latencyMs: null };
        }
      }

      const isHealthy = circuitBreaker.state !== "OPEN" && dbStatus.connected;

      return res.code(isHealthy ? 200 : 503).send({
        status: isHealthy ? "healthy" : "unhealthy",
        uptime: Math.floor(process.uptime()),
        circuitBreaker,
        database: dbStatus,
      });
    }
  );
};

export default registerHealthRoute;
