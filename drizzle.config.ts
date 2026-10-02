import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL が未設定です。.dev.vars を確認してください");
}

export default defineConfig({
	schema: "./src/worker/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: { url: databaseUrl },
});
