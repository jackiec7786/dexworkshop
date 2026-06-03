import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT * FROM settings WHERE owner = 'shop'`;
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: Request) {
  const b = await req.json();
  const rows = await sql`
    INSERT INTO settings (owner, biz_name, tagline, phone, email, address, currency, tax_rate)
    VALUES ('shop', ${b.biz_name}, ${b.tagline}, ${b.phone}, ${b.email},
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
