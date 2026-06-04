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
  const { date, category, supplier, amount, gst, note } = await req.json();

  const rows = await sql`
    UPDATE expenses
    SET date     = ${date},
        category = ${category},
        supplier = ${supplier ?? ""},
        amount   = ${Number(amount) || 0},
        gst      = ${Number(gst) || 0},
        note     = ${note ?? ""}
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
  await sql`DELETE FROM expenses WHERE id = ${id} AND owner = ${SHOP_OWNER}`;
  return NextResponse.json({ ok: true });
}
