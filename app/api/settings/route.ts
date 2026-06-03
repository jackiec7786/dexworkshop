import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { settingsSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const rows = await sql`SELECT * FROM settings WHERE owner = ${SHOP_OWNER}`;
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: Request) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const parsed = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const b = parsed.data;

  const rows = await sql`
    INSERT INTO settings (owner, biz_name, tagline, phone, email, address, currency, tax_rate)
    VALUES (${SHOP_OWNER}, ${b.biz_name}, ${b.tagline}, ${b.phone}, ${b.email},
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
