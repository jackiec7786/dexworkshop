import { NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { sql } from "@/lib/db";

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql`SELECT * FROM settings WHERE owner = ${user.id}`;
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: Request) {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const rows = await sql`
    INSERT INTO settings (owner, biz_name, tagline, phone, email, address, currency, tax_rate)
    VALUES (${user.id}, ${b.biz_name}, ${b.tagline}, ${b.phone}, ${b.email},
            ${b.address}, ${b.currency}, ${b.tax_rate})
    ON CONFLICT (owner) DO UPDATE SET
      biz_name = EXCLUDED.biz_name, tagline = EXCLUDED.tagline,
      phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address,
      currency = EXCLUDED.currency, tax_rate = EXCLUDED.tax_rate,
      updated_at = NOW()
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
