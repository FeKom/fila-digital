import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/infra/database/setup/runner-up.ts",
    "src/infra/database/migrations/*.ts",
  ],
  format: ["esm"],
  outDir: "dist",
  splitting: true,
  clean: true,
  sourcemap: false,
});
