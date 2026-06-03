import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { jobPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const parsed = jobPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const b = parsed.data;

  const rows = await sql`
    UPDATE jobs SET
      status     = COALESCE(${b.status     ?? null}, status),
      customer   = COALESCE(${b.customer   != null ? JSON.stringify(b.customer)   : null}::jsonb, customer),
      vehicle    = COALESCE(${b.vehicle    != null ? JSON.stringify(b.vehicle)    : null}::jsonb, vehicle),
      marks      = COALESCE(${b.marks      != null ? JSON.stringify(b.marks)      : null}::jsonb, marks),
      line_items = COALESCE(${b.line_items != null ? JSON.stringify(b.line_items) : null}::jsonb, line_items),
      notes      = COALESCE(${b.notes      ?? null}, notes),
      discount   = COALESCE(${b.discount   ?? null}, discount),
      tax_rate   = COALESCE(${b.tax_rate   ?? null}, tax_rate),
      deposit    = COALESCE(${b.deposit    ?? null}, deposit),
      photos     = COALESCE(${b.photos     != null ? JSON.stringify(b.photos)     : null}::jsonb, photos)
    WHERE id = ${id} AND owner = ${SHOP_OWNER}
    RETURNING *
  `;
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await sql`DELETE FROM jobs WHERE id = ${id} AND owner = ${SHOP_OWNER}`;
  return NextResponse.json({ ok: true });
}
