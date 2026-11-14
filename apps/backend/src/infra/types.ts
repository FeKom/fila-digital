import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PersonRole } from "./database/types";

// Must match the claims signed by signAccessToken.
export type TokenPayload = {
  id: string;
  name: string;
  email: string;
  role: PersonRole;
};

export type Server = FastifyInstance;
export type ServerRequest = FastifyRequest & { user?: TokenPayload };
export type ServerResponse = FastifyReply;
