import { Hono } from "hono";
import type { Bindings } from "./env";

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

const routes = app.get("/health", (c) => c.json({ status: "ok" as const }));

// フロントの Hono RPC クライアントが API の型を参照するために export する
export type AppType = typeof routes;

export default app;
