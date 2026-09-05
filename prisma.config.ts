import { defineConfig, env } from "prisma/config";
import "dotenv/config";

// Used by CLI commands (migrate, studio, introspect); the runtime PrismaClient in lib/db.ts connects separately via @prisma/adapter-pg.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
