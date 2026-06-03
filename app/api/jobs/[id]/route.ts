import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
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
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await sql`DELETE FROM jobs WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
