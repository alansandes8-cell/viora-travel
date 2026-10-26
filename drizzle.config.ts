import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public", "internal"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
