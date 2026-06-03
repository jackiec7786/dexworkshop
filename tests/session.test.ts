import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("session tokens", () => {
  it("round-trips a valid payload", async () => {
    const token = await createSessionToken({ sub: "user-1", email: "a@b.com" });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sub: "user-1", email: "a@b.com" });
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({ sub: "user-1", email: "a@b.com" });
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });
});
