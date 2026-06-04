import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const rows = await sql`
    SELECT * FROM customers
    WHERE owner = ${SHOP_OWNER}
    ORDER BY updated_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { phone = "", notes = "", tags = [] } = await req.json();
  const digitsOnly = phone.replace(/\D/g, "");

  // Upsert by phone when phone is present; plain insert when phone is empty.
  if (digitsOnly) {
    const rows = await sql`
      INSERT INTO customers (owner, phone, notes, tags)
      VALUES (${SHOP_OWNER}, ${digitsOnly}, ${notes}, ${JSON.stringify(tags)})
      ON CONFLICT (owner, phone) WHERE phone != '' DO UPDATE
        SET notes = EXCLUDED.notes, tags = EXCLUDED.tags, updated_at = NOW()
      RETURNING *`;
    return NextResponse.json(rows[0], { status: 201 });
  }

  const rows = await sql`
    INSERT INTO customers (owner, phone, notes, tags)
    VALUES (${SHOP_OWNER}, '', ${notes}, ${JSON.stringify(tags)})
    RETURNING *`;
  return NextResponse.json(rows[0], { status: 201 });
}
