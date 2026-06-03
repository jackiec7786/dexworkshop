import { describe, it, expect } from "vitest";
import { calc, pkr } from "@/components/shared";
import type { Job } from "@/components/shared";

function job(over: Partial<Job> = {}): Job {
  return {
    id: "j1", status: "Quote", customer: {}, vehicle: {}, marks: [],
    line_items: [], notes: "", discount: 0, tax_rate: 0, deposit: 0, photos: [],
    created_at: new Date().toISOString(), ...over,
  };
}

describe("calc", () => {
  it("sums line items into a subtotal", () => {
    const c = calc(job({ line_items: [
      { id: "a", desc: "", type: "PDR", qty: 2, price: 1000 },
      { id: "b", desc: "", type: "Tint", qty: 1, price: 500 },
    ] }));
    expect(c.sub).toBe(2500);
    expect(c.total).toBe(2500);
    expect(c.due).toBe(2500);
  });

  it("applies discount before tax", () => {
    const c = calc(job({
      line_items: [{ id: "a", desc: "", type: "PDR", qty: 1, price: 1000 }],
      discount: 200, tax_rate: 10,
    }));
    expect(c.disc).toBe(200);
    expect(c.taxed).toBeCloseTo(80); // (1000 - 200) * 10%
    expect(c.total).toBeCloseTo(880);
  });

  it("subtracts the deposit to give the balance due", () => {
    const c = calc(job({
      line_items: [{ id: "a", desc: "", type: "PDR", qty: 1, price: 1000 }],
      deposit: 300,
    }));
    expect(c.total).toBe(1000);
    expect(c.due).toBe(700);
  });

  it("treats non-numeric fields as zero", () => {
    const c = calc(job({ line_items: [
      // @ts-expect-error — exercising defensive coercion of bad data
      { id: "a", desc: "", type: "PDR", qty: "x", price: "y" },
    ] }));
    expect(c.sub).toBe(0);
  });
});

describe("pkr", () => {
  it("rounds and appends the slash-dash suffix", () => {
    expect(pkr(99.6)).toBe("100/-");
    expect(pkr(0)).toBe("0/-");
  });

  it("never returns NaN for bad input", () => {
    // @ts-expect-error — intentionally passing a non-number
    expect(pkr(undefined)).toBe("0/-");
  });
});
