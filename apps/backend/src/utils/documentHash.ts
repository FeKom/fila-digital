import { createHmac } from "crypto";
import config from "../infra/config";

// Separate from token.secret: rotating the JWT key must not invalidate the
// stored CNPJ hashes, and a leak of one secret must not expose the other.
const secret = config.get<string>("documentHash.secret");

if (!secret) {
  throw new Error("documentHash.secret is empty. Set DOCUMENT_HASH_SECRET.");
}

export const hashDocument = (document: string): string =>
  createHmac("sha256", secret).update(document).digest("hex");
