import { FastifySchema } from "fastify";

// ─────────────────────────────────────────────────────────────────────────────
// Reusable fragments
// ─────────────────────────────────────────────────────────────────────────────

const commerceIdParam = {
  type: "object",
  required: ["commerce_id"],
  properties: {
    commerce_id: { type: "string", minLength: 1 },
  },
} as const;

const paginationQuerystring = {
  type: "object",
  properties: {
    cursor: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
  additionalProperties: false,
} as const;

const errorResponse = {
  type: "object",
  properties: {
    statusCode: { type: "number" },
    error: { type: "string" },
    message: { type: "string" },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// GET /participants-queue/:commerce_id
// ─────────────────────────────────────────────────────────────────────────────

export const listByCommerceSchema: FastifySchema = {
  tags: ["Participants Queue"],
  description: "List queue participants for a commerce (paginated)",
  params: commerceIdParam,
  querystring: paginationQuerystring,
  response: {
    200: {
      description: "List of participants",
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              user_id: { type: "string" },
              queue_id: { type: "string" },
              position: { type: "number" },
            },
          },
        },
        nextCursor: { type: "string", nullable: true },
      },
    },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /participants-queue/enter/:commerce_id
// ─────────────────────────────────────────────────────────────────────────────

export const enterQueueSchema: FastifySchema = {
  tags: ["Participants Queue"],
  description:
    "Enter a queue as an authenticated user. Requires JWT. Use this when the user is logged in. For anonymous/QR code entry, use POST /enter-queue instead.",
  params: commerceIdParam,
  response: {
    201: {
      description: "Entered queue successfully",
      type: "object",
      properties: {
        id: { type: "string" },
        position: { type: "number" },
      },
    },
    400: { description: "Validation error", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /participants-queue/:commerce_id/next
// ─────────────────────────────────────────────────────────────────────────────

export const removeFirstSchema: FastifySchema = {
  tags: ["Participants Queue"],
  description: "Remove the first participant from the queue (call next)",
  params: commerceIdParam,
  response: {
    200: {
      description: "Participant removed successfully",
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
    401: { description: "Unauthorized", ...errorResponse },
    404: { description: "Queue empty or not found", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /participants-queue/:commerce_id/exit
// ─────────────────────────────────────────────────────────────────────────────

export const exitQueueSchema: FastifySchema = {
  tags: ["Participants Queue"],
  description: "Exit the queue voluntarily",
  params: commerceIdParam,
  response: {
    200: {
      description: "Exited queue successfully",
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
    401: { description: "Unauthorized", ...errorResponse },
    404: { description: "Not in queue", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /enter-queue
// ─────────────────────────────────────────────────────────────────────────────

export const enterByQrCodeSchema: FastifySchema = {
  tags: ["Participants Queue"],
  description:
    "Enter a queue by scanning a QR code (public — no auth required). Supports both registered users (via userId) and anonymous users (via anonymousId). Validates the QR code token against the queue. For authenticated entry, use POST /participants-queue/enter/:commerce_id instead.",
  security: [],
  body: {
    type: "object",
    required: ["queueId", "qrcodeToken"],
    properties: {
      queueId: { type: "string", minLength: 1 },
      qrcodeToken: { type: "string", minLength: 1 },
      userId: { type: "string", minLength: 1 },
      anonymousId: { type: "string", minLength: 1 },
    },
    oneOf: [{ required: ["userId"] }, { required: ["anonymousId"] }],
    additionalProperties: false,
  },
  response: {
    201: {
      description: "Entered queue via QR code successfully",
      type: "object",
      properties: {
        id: { type: "string" },
        position: { type: "number" },
      },
    },
    400: {
      description: "Invalid QR code or validation error",
      ...errorResponse,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /participants-queue/:commerce_id/next/:count
// ─────────────────────────────────────────────────────────────────────────────

export const removeNextNSchema: FastifySchema = {
  tags: ["Participants Queue"],
  description: "Remove the next N participants from the queue in batch",
  params: {
    type: "object",
    required: ["commerce_id", "count"],
    properties: {
      commerce_id: { type: "string", minLength: 1 },
      /**
       * Number of participants to dequeue in one batch.
       * Capped at 50 — enough for high-volume commerce without hammering the DB.
       * Fastify coerces path params from string to integer automatically.
       */
      count: { type: "integer", minimum: 1, maximum: 50 },
    },
  },
  response: {
    200: {
      description: "Participants removed successfully",
      type: "object",
      properties: {
        message: { type: "string" },
        removed: { type: "number" },
      },
    },
    401: { description: "Unauthorized", ...errorResponse },
    404: { description: "Queue empty or not found", ...errorResponse },
  },
};
