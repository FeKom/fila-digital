export const subscribePushSchema = {
  body: {
    type: "object",
    required: ["subscription"],
    properties: {
      subscription: {
        type: "object",
        required: ["endpoint", "keys"],
        properties: {
          endpoint: { type: "string" },
          keys: {
            type: "object",
            required: ["auth", "p256dh"],
            properties: {
              auth: { type: "string" },
              p256dh: { type: "string" },
            },
          },
        },
      },
    },
  },
  response: {
    201: {
      type: "object",
      properties: { message: { type: "string" } },
    },
  },
};
