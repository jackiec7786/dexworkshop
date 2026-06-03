import { neon } from "@neondatabase/serverless";
import { env } from "./env";

// Single shop deployment: all rows live under one owner key. In a multi-tenant
// model this would become the authenticated user's id.
export const SHOP_OWNER = "shop";

// `neon()` only builds the query function — no connection is opened until the
// first query runs — so this is safe at module load (build/CI set DATABASE_URL).
export const sql = neon(env.databaseUrl);
