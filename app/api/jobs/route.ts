import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT * FROM jobs ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST() {
  const rows = await sql`INSERT INTO jobs (owner) VALUES ('shop') RETURNING *`;
  return NextResponse.json(rows[0]);
}
