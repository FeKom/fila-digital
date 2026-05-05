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
// DELETE /commerce/:commerce_id/delete
// ─────────────────────────────────────────────────────────────────────────────

export const deleteCommerceSchema: FastifySchema = {
  tags: ["Commerce"],
  description:
    "Soft-delete a commerce. The commerce is marked as inactive but not removed from the database.",
  params: commerceIdParam,
  response: {
    200: {
      description: "Commerce deleted successfully",
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
    401: { description: "Unauthorized", ...errorResponse },
    404: { description: "Commerce not found", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /commerce/register
// ─────────────────────────────────────────────────────────────────────────────

export const registerCommerceSchema: FastifySchema = {
  tags: ["Commerce"],
  description: "Register a new commerce",
  body: {
    type: "object",
    required: ["name", "document_id"],
    properties: {
      name: { type: "string", minLength: 2, maxLength: 100 },
      description: { type: "string", maxLength: 500 },
      phone: { type: "string", minLength: 8, maxLength: 20 },
      /**
       * Raw CNPJ — accepts formatted (00.000.000/0000-00) or digits-only.
       * The controller runs the full jsvat check after this structural gate.
       */
      document_id: { type: "string", minLength: 14, maxLength: 18 },
      open_at: { type: "string" },
      closed_at: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      description: "Commerce created successfully",
      type: "object",
      properties: {
        commerce_id: { type: "string" },
        name: { type: "string" },
        message: { type: "string" },
      },
    },
    400: { description: "Validation error", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /commerce
// ─────────────────────────────────────────────────────────────────────────────

export const listCommercesSchema: FastifySchema = {
  tags: ["Commerce"],
  description: "List all commerces (paginated)",
  querystring: paginationQuerystring,
  response: {
    200: {
      description: "List of commerces",
      type: "object",
      properties: {
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            commerces: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
              },
            },
            nextCursor: { type: "string", nullable: true },
            hasMore: { type: "boolean" },
          },
        },
      },
    },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /commerce/nearby
// ─────────────────────────────────────────────────────────────────────────────

export const nearbyQueuesSchema: FastifySchema = {
  tags: ["Commerce"],
  description:
    "Returns commerces with open queues within a given radius, sorted by distance. Public endpoint — no auth required.",
  querystring: {
    type: "object",
    required: ["lat", "lng"],
    properties: {
      lat: { type: "number", minimum: -90, maximum: 90 },
      lng: { type: "number", minimum: -180, maximum: 180 },
      radius: { type: "integer", minimum: 1, maximum: 50000, default: 5000 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: "Nearby commerces with open queues",
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          latitude: { type: "number", nullable: true },
          longitude: { type: "number", nullable: true },
          open_queues_count: { type: "number" },
          distance_meters: { type: "number" },
        },
      },
    },
    400: { description: "Missing or invalid params", ...errorResponse },
    500: { description: "Internal error", ...errorResponse },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /commerce/:commerce_id/update
// ─────────────────────────────────────────────────────────────────────────────

export const updateCommerceSchema: FastifySchema = {
  tags: ["Commerce"],
  description: "Update an existing commerce",
  params: commerceIdParam,
  body: {
    type: "object",
    // All fields are optional on update — send only what needs to change.
    properties: {
      name: { type: "string", minLength: 2, maxLength: 100 },
      description: { type: "string", maxLength: 500 },
      phone: { type: "string", minLength: 8, maxLength: 20 },
      open_at: { type: "string" },
      closed_at: { type: "string" },
    },
    additionalProperties: false,
    minProperties: 1,
  },
  response: {
    200: {
      description: "Commerce updated successfully",
      type: "object",
      properties: {
        message: { type: "string" },
        data: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
    400: { description: "Validation error", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};
