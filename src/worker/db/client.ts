import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// 接続方式（HTTP / WebSocket / Hyperdrive）は S0 で検証して確定する（設計メモ リスク1）
export function createDb(databaseUrl: string) {
	return drizzle(neon(databaseUrl), { schema });
}
