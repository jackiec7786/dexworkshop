import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { jobPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = jobPatchSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[PATCH /api/jobs/%s] validation failed:", id, JSON.stringify(parsed.error.issues));
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input.", issues: parsed.error.issues }, { status: 400 });
  }
  const b = parsed.data;

  // Main update — deliberately excludes scheduled_date so this query works even
  // if the Phase 2 migration (ALTER TABLE jobs ADD COLUMN scheduled_date DATE)
  // has not been run yet.
  let rows: Awaited<ReturnType<typeof sql>>;
  try {
    rows = await sql`
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
  } catch (err) {
    console.error("[PATCH /api/jobs/%s] DB error:", id, err);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });

  // scheduled_date — separate query so a missing column never blocks the main save.
  let result = rows[0];
  if (b.scheduled_date !== undefined) {
    try {
      const sched = b.scheduled_date || null; // "" → null (unschedule)
      const sr = await sql`
        UPDATE jobs SET scheduled_date = ${sched}
        WHERE id = ${id} AND owner = ${SHOP_OWNER}
        RETURNING *`;
      if (sr[0]) result = sr[0];
    } catch { /* Phase 2 migration not yet applied — safe to skip */ }
  }

  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await sql`DELETE FROM jobs WHERE id = ${id} AND owner = ${SHOP_OWNER}`;
  return NextResponse.json({ ok: true });
}
