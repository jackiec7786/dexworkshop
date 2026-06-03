import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

// Edge-safe session helpers (jose runs in the Edge runtime, so middleware can
// verify the cookie without a Node-only crypto dependency or a DB round-trip).

export const SESSION_COOKIE = "dex_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export type SessionPayload = { sub: string; email: string };

function key(): Uint8Array {
  return new TextEncoder().encode(env.authSecret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
