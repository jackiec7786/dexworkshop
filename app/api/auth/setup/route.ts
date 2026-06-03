import { NextResponse } from "next/server";
import { credentialsSchema } from "@/lib/validation";
import { countUsers, createUser } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// One-time bootstrap: create the shop's first (and only) account.
// Refuses once any user exists, so it can't be used to add rogue accounts.
export async function POST(req: Request) {
  const limit = rateLimit(`setup:${clientIp(req)}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  if ((await countUsers()) > 0) {
    return NextResponse.json({ error: "An account already exists. Please sign in." }, { status: 403 });
  }

  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await createUser(email, await hashPassword(password));
  const token = await createSessionToken({ sub: user.id, email: user.email });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return res;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
