import { FastifySchema } from "fastify";

// ─────────────────────────────────────────────────────────────────────────────
// Shared fragments
// ─────────────────────────────────────────────────────────────────────────────

const queueIdParams = {
  type: "object",
  required: ["commerce_id", "queue_id"],
  properties: {
    commerce_id: { type: "string", minLength: 1 },
    queue_id: { type: "string", minLength: 1 },
  },
} as const;

const queueBodyProperties = {
  commerce_id: { type: "string", minLength: 1 },
  name: { type: "string", minLength: 2, maxLength: 100 },
  description: { type: "string", maxLength: 500 },
  type: { type: "string", enum: ["ephemera", "permanent"] },
  status: { type: "string", enum: ["open", "closed"] },
  active: { type: "boolean" },
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
// POST /queue/register
// ─────────────────────────────────────────────────────────────────────────────

export const registerQueueSchema: FastifySchema = {
  tags: ["Queue"],
  description:
    "Register a new queue for a commerce. A queue always belongs to a commerce (via commerce_id). Type can be 'ephemera' (temporary) or 'permanent'.",
  body: {
    type: "object",
    required: ["commerce_id", "name", "type", "status"],
    properties: queueBodyProperties,
    additionalProperties: false,
  },
  response: {
    201: {
      description: "Queue created successfully",
      type: "object",
      properties: {
        queue: {
          type: "object",
          properties: {
            id: { type: "string" },
            commerce_id: { type: "string" },
          },
        },
        qrcode: { type: "string" },
        qrcodeData: {
          type: "object",
          properties: {
            queueId: { type: "string" },
            token: { type: "string" },
            createdAt: {},
          },
        },
        message: { type: "string" },
      },
    },
    400: { description: "Validation error", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /queue/:commerce_id/:queue_id/update
// ─────────────────────────────────────────────────────────────────────────────

export const updateQueueSchema: FastifySchema = {
  tags: ["Queue"],
  description:
    "Update an existing queue. Requires commerce_id and queue_id in the path to identify which queue to update.",
  params: queueIdParams,
  body: {
    type: "object",
    // All fields optional on update — controller decides what to apply
    properties: queueBodyProperties,
    additionalProperties: false,
    minProperties: 1,
  },
  response: {
    200: {
      description: "Queue updated successfully",
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
    400: { description: "Validation error", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /queue/:commerce_id/:queue_id/delete
// ─────────────────────────────────────────────────────────────────────────────

export const deleteQueueSchema: FastifySchema = {
  tags: ["Queue"],
  description:
    "Soft-delete a queue. The queue is marked as inactive but not removed from the database. Requires commerce_id and queue_id.",
  params: queueIdParams,
  response: {
    200: {
      description: "Queue deleted successfully",
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
    401: { description: "Unauthorized", ...errorResponse },
    404: { description: "Queue not found", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /queue/:commerce_id/:queue_id/schedule
// ─────────────────────────────────────────────────────────────────────────────

export const createScheduleSchema: FastifySchema = {
  tags: ["Queue"],
  description:
    "Create an auto-open schedule for a queue. type='once' requires scheduled_at. type='daily' uses the commerce open_at time.",
  params: queueIdParams,
  body: {
    type: "object",
    required: ["type"],
    properties: {
      type: { type: "string", enum: ["once", "daily"] },
      scheduled_at: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: { data: { type: "object" } },
    },
    400: { description: "Validation error", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /queue/:commerce_id/:queue_id/schedule
// ─────────────────────────────────────────────────────────────────────────────

export const getScheduleSchema: FastifySchema = {
  tags: ["Queue"],
  description: "Get the current schedule for a queue.",
  params: queueIdParams,
  response: {
    200: {
      type: "object",
      properties: { data: {} },
    },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /queue/:commerce_id/:queue_id/schedule/:schedule_id/toggle
// ─────────────────────────────────────────────────────────────────────────────

export const toggleScheduleSchema: FastifySchema = {
  tags: ["Queue"],
  description: "Activate or deactivate a queue schedule.",
  params: {
    type: "object",
    required: ["commerce_id", "queue_id", "schedule_id"],
    properties: {
      commerce_id: { type: "string" },
      queue_id: { type: "string" },
      schedule_id: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: { type: "string", enum: ["active", "inactive"] },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: { message: { type: "string" } },
    },
    401: { description: "Unauthorized", ...errorResponse },
  },
};
