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
