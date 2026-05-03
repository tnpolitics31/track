import { defineConfig } from "drizzle-kit";

if (!process.env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL must be set.");
if (!process.env.TURSO_AUTH_TOKEN) throw new Error("TURSO_AUTH_TOKEN must be set.");

export default defineConfig({
  dialect: "turso",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
