import { FastifySchema } from "fastify";

// ─────────────────────────────────────────────────────────────────────────────
// User Schemas
//
// These schemas are compiled once at startup by AJV and run before any
// controller code. They handle structural validation only:
//   - required fields
//   - type checking
//   - minLength / maxLength
//
// Business-specific validation (Brazilian phone format, email uniqueness)
// stays in the controller where it belongs.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Reusable response fragments
// ─────────────────────────────────────────────────────────────────────────────

const errorResponse = {
  type: "object",
  properties: {
    statusCode: { type: "number" },
    error: { type: "string" },
    message: { type: "string" },
  },
} as const;

export const registerSchema: FastifySchema = {
  tags: ["User"],
  description: "Register a new user",
  security: [],
  body: {
    type: "object",
    required: ["name", "email", "password", "phone"],
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        minLength: 2,
        maxLength: 100,
      },
      email: {
        type: "string",
        minLength: 5,
        maxLength: 255,
      },
      password: {
        type: "string",
        minLength: 8,
      },
      phone: {
        type: "string",
        minLength: 8,
        maxLength: 20,
      },
    },
  },
  response: {
    201: {
      description: "User created successfully",
      type: "object",
      properties: {
        message: { type: "string" },
        access_token: { type: "string" },
        refresh_token: { type: "string" },
      },
    },
    400: { description: "Validation error", ...errorResponse },
  },
};

export const updateUserSchema: FastifySchema = {
  tags: ["User"],
  description: "Update the authenticated user's profile (name and/or phone)",
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2, maxLength: 100 },
      phone: { type: "string", minLength: 8, maxLength: 20 },
    },
    additionalProperties: false,
    minProperties: 1,
  },
  response: {
    200: {
      description: "User updated successfully",
      type: "object",
      properties: { message: { type: "string" } },
    },
    400: { description: "Validation error", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

export const deleteUserSchema: FastifySchema = {
  tags: ["User"],
  description: "Soft-delete the authenticated user's account",
  response: {
    200: {
      description: "User deleted successfully",
      type: "object",
      properties: { message: { type: "string" } },
    },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

export const loginSchema: FastifySchema = {
  tags: ["User"],
  description: "Authenticate a user and return a JWT token",
  security: [],
  body: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: {
        type: "string",
        minLength: 5,
        maxLength: 255,
      },
      password: {
        type: "string",
        minLength: 1,
      },
    },
  },
  response: {
    200: {
      description: "Login successful",
      type: "object",
      properties: {
        access_token: { type: "string" },
        refresh_token: { type: "string" },
        message: { type: "string" },
      },
    },
    400: { description: "Invalid credentials", ...errorResponse },
    401: { description: "Unauthorized", ...errorResponse },
  },
};

export const refreshTokenSchema: FastifySchema = {
  tags: ["User"],
  description: "Exchange a refresh token for a new access token",
  security: [],
  body: {
    type: "object",
    required: ["refresh_token"],
    additionalProperties: false,
    properties: {
      refresh_token: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      description: "Token refreshed successfully",
      type: "object",
      properties: {
        access_token: { type: "string" },
        refresh_token: { type: "string" },
        message: { type: "string" },
      },
    },
    401: { description: "Invalid or expired token", ...errorResponse },
  },
};

export const logoutSchema: FastifySchema = {
  tags: ["User"],
  description: "Revoke the refresh token and log out",
  security: [],
  body: {
    type: "object",
    properties: {
      refresh_token: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: "Logged out successfully",
      type: "object",
      properties: { message: { type: "string" } },
    },
  },
};
