import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const rows = await sql`
    SELECT * FROM expenses
    WHERE owner = ${SHOP_OWNER}
    ORDER BY date DESC, created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { date, category, supplier, amount, gst, note } = await req.json();
  if (!date || !category) {
    return NextResponse.json({ error: "date and category are required" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO expenses (owner, date, category, supplier, amount, gst, note)
    VALUES (
      ${SHOP_OWNER}, ${date}, ${category},
      ${supplier ?? ""}, ${Number(amount) || 0}, ${Number(gst) || 0}, ${note ?? ""}
    )
    RETURNING *`;
  return NextResponse.json(rows[0], { status: 201 });
}
