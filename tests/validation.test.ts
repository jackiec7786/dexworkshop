import { describe, it, expect } from "vitest";
import { credentialsSchema, jobPatchSchema, settingsSchema } from "@/lib/validation";

describe("credentialsSchema", () => {
  it("accepts a valid email + password and normalizes the email", () => {
    const r = credentialsSchema.parse({ email: "  Owner@Shop.COM ", password: "longenough" });
    expect(r.email).toBe("owner@shop.com");
  });

  it("rejects a short password", () => {
    expect(credentialsSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(credentialsSchema.safeParse({ email: "nope", password: "longenough" }).success).toBe(false);
  });
});

describe("jobPatchSchema", () => {
  it("accepts a partial update", () => {
    expect(jobPatchSchema.safeParse({ status: "Invoice" }).success).toBe(true);
    expect(jobPatchSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(jobPatchSchema.safeParse({ status: "Bogus" }).success).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("fills defaults for missing fields", () => {
    const r = settingsSchema.parse({ biz_name: "DEX" });
    expect(r.currency).toBe("Rs");
    expect(r.tax_rate).toBe(0);
  });
});
