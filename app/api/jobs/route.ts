import { NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { sql } from "@/lib/db";

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql`SELECT * FROM jobs WHERE owner = ${user.id} ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST() {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql`INSERT INTO jobs (owner) VALUES (${user.id}) RETURNING *`;
  return NextResponse.json(rows[0]);
}
