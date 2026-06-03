import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const rows = await sql`
    SELECT * FROM inventory
    WHERE owner = ${SHOP_OWNER}
    ORDER BY category, name`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { name, category, unit, stock, reorder_at, cost, supplier, notes } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const rows = await sql`
    INSERT INTO inventory (owner, name, category, unit, stock, reorder_at, cost, supplier, notes)
    VALUES (
      ${SHOP_OWNER}, ${name}, ${category ?? "Other"}, ${unit ?? "pcs"},
      ${Number(stock) || 0}, ${Number(reorder_at) || 0}, ${Number(cost) || 0},
      ${supplier ?? ""}, ${notes ?? ""}
    )
    RETURNING *`;
  return NextResponse.json(rows[0], { status: 201 });
}
