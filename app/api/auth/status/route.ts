import { NextResponse } from "next/server";
import { countUsers } from "@/lib/users";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// Drives the login screen: whether a first account must be created, and
// whether the current visitor already has a valid session.
export async function GET() {
  const [n, session] = await Promise.all([countUsers(), getSession()]);
  return NextResponse.json({
    needsSetup: n === 0,
    authenticated: Boolean(session),
    email: session?.email ?? null,
  });
}
