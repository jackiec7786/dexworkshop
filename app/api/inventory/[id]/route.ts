import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();

  // Quick stock adjustment: { adjust: delta }
  if ("adjust" in body) {
    const delta = Number(body.adjust) || 0;
    const rows = await sql`
      UPDATE inventory
      SET stock = GREATEST(0, stock + ${delta}), updated_at = NOW()
      WHERE id = ${id} AND owner = ${SHOP_OWNER}
      RETURNING *`;
    if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  // Full item update
  const { name, category, unit, stock, reorder_at, cost, supplier, notes } = body;
  const rows = await sql`
    UPDATE inventory SET
      name       = ${name},
      category   = ${category ?? "Other"},
      unit       = ${unit ?? "pcs"},
      stock      = ${Number(stock) || 0},
      reorder_at = ${Number(reorder_at) || 0},
      cost       = ${Number(cost) || 0},
      supplier   = ${supplier ?? ""},
      notes      = ${notes ?? ""},
      updated_at = NOW()
    WHERE id = ${id} AND owner = ${SHOP_OWNER}
    RETURNING *`;
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await sql`DELETE FROM inventory WHERE id = ${id} AND owner = ${SHOP_OWNER}`;
  return NextResponse.json({ ok: true });
}
