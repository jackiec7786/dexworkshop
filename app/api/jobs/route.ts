import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const rows = await sql`SELECT * FROM jobs WHERE owner = ${SHOP_OWNER} ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const rows = await sql`INSERT INTO jobs (owner) VALUES (${SHOP_OWNER}) RETURNING *`;
  return NextResponse.json(rows[0]);
}
