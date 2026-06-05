import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

async function applyMigrations() {
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_date DATE`;
  await sql`CREATE INDEX IF NOT EXISTS jobs_scheduled_idx ON jobs(owner, scheduled_date)`;
}

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  // Idempotent — noop after first run; fire-and-forget so it doesn't block the response
  applyMigrations().catch(() => {});

  const [jobs, settingsRows, expenses, customers, inventory] = await Promise.all([
    sql`SELECT * FROM jobs WHERE owner = ${SHOP_OWNER} ORDER BY created_at DESC`,
    sql`SELECT * FROM settings WHERE owner = ${SHOP_OWNER}`,
    sql`SELECT * FROM expenses WHERE owner = ${SHOP_OWNER} ORDER BY date DESC, created_at DESC`,
    sql`SELECT * FROM customers WHERE owner = ${SHOP_OWNER} ORDER BY updated_at DESC`.catch(() => []),
    sql`SELECT * FROM inventory WHERE owner = ${SHOP_OWNER} ORDER BY category, name`.catch(() => []),
  ]);

  return NextResponse.json({
    email: auth.email,
    jobs,
    settings: settingsRows[0] ?? null,
    expenses,
    customers,
    inventory,
  });
}
