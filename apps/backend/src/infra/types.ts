import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { User } from "../domain/user/type";

export type Server = FastifyInstance;
export type ServerRequest = FastifyRequest & { user?: User };
export type ServerResponse = FastifyReply;
