import { createHmac } from "crypto";
import config from "../infra/config";

const secret = config.get<string>("token.secret");

export const hashDocument = (document: string): string =>
  createHmac("sha256", secret).update(document).digest("hex");
