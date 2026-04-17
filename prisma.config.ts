import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // direktna povezava za migracije (brez pooling-a)
    url: process.env["DIRECT_URL"],
  },
});
