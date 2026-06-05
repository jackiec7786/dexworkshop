import { NextResponse } from "next/server";
import { sql, SHOP_OWNER } from "@/lib/db";

export const runtime = "nodejs";

// Public unauthenticated endpoint — returns job + settings for quote sharing.
// The job UUID is the only secret; no sensitive auth data is exposed.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [jobs, settings] = await Promise.all([
    sql`SELECT * FROM jobs WHERE id = ${id} AND owner = ${SHOP_OWNER}`,
    sql`SELECT * FROM settings WHERE owner = ${SHOP_OWNER}`,
  ]);
  if (!jobs[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ job: jobs[0], settings: settings[0] ?? null });
}
