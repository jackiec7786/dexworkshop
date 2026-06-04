"use client";
import { useRef } from "react";

export type Mark = { id: string; x: number; y: number; view: string; type: string; note: string; sqin?: number };
export type LineItem = { id: string; desc: string; type: string; qty: number; price: number };

// DEX inspection codes — the shop's real damage vocabulary (from the printed sheet).
export const DEX_CODES: Record<string, string> = {
  SH: "Swirl / Holograms", OX: "Oxidation", CF: "Clearcoat Failure",
  DS: "Deep Scratch", BD: "Bird Dropping", RP: "Rough Paint / Repainted",
  UD: "Unknown Defect", PT: "Paint Transfer", PC: "Paint Chip",
  GS: "Glass Scratch", GC: "Glass Chip / Gouges", DD: "Dents / Dings",
  SS: "Side Swipe", CR: "Curb Rash", WD: "Wheel Damage", LM: "Loose Molding",
};
export const CODE_KEYS = Object.keys(DEX_CODES);

// Pakistani currency style: "8,500/-" — comma thousands, slash-dash suffix, no decimals.
export function pkr(n: number) {
  return (Math.round(Number(n) || 0)).toLocaleString("en-PK") + "/-";
}
export type Job = {
  id: string;
  status: "Quote" | "Invoice" | "Paid";
  customer: { name?: string; phone?: string; email?: string };
  vehicle: { make?: string; model?: string; year?: string; plate?: string; color?: string; vin?: string };
  marks: Mark[];
  line_items: LineItem[];
  notes: string;
  discount: number;
  tax_rate: number;
  deposit: number;
  photos: { url: string; caption?: string }[];
  scheduled_date?: string | null; // "YYYY-MM-DD" booking date
  created_at: string;
};
export type Settings = {
  biz_name: string; tagline: string; phone: string; email: string;
  address: string; currency: string; tax_rate: number;
};

export const CUSTOMER_TAGS = ["VIP", "Regular", "Fleet", "Wholesale", "Referred", "Blocked"] as const;
export type CustomerRecord = {
  id: string;
  phone: string;  // normalized digits — the join key
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export const INVENTORY_CATEGORIES = ["Film", "Chemical", "Consumable", "Equipment", "Other"] as const;
export const STOCK_UNITS = ["pcs", "rolls", "liters", "ml", "meters", "kg", "g", "boxes", "sheets", "sets"] as const;

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  reorder_at: number;
  cost: number;
  supplier: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Materials", "Labour",
  "Fuel", "Equipment", "Maintenance", "Other",
] as const;

export type Expense = {
  id: string;
  date: string;      // "YYYY-MM-DD"
  category: string;
  supplier: string;
  amount: number;
  gst: number;
  note: string;
  created_at: string;
};

// Service types for line items (what you bill for).
export const SERVICE_TYPES = ["PDR", "Tint", "Wrap", "PPF", "Customs", "Detail", "Other"];

// Color families so 16 codes stay visually distinguishable on the map:
// red=paint defects, blue=glass, yellow=body/dents, purple=wheel/trim.
const CODE_GROUP: Record<string, string> = {
  SH: "paint", OX: "paint", CF: "paint", DS: "paint", BD: "paint", RP: "paint", UD: "paint", PT: "paint", PC: "paint",
  GS: "glass", GC: "glass",
  DD: "body", SS: "body",
  CR: "wheel", WD: "wheel", LM: "wheel",
};
const GROUP_COLOR: Record<string, string> = {
  paint: "#ff5c5c", glass: "#4fc3ff", body: "#ffd24f", wheel: "#9b8cff",
};
export const MARK_COLORS: Record<string, string> = new Proxy({}, {
  get: (_t, code: string) => GROUP_COLOR[CODE_GROUP[code]] || "#9aa0a6",
});

export function calc(job: Job) {
  const sub = job.line_items.reduce((s, li) => s + (Number(li.qty) || 0) * (Number(li.price) || 0), 0);
  const disc = Number(job.discount) || 0;
  const taxed = (sub - disc) * ((Number(job.tax_rate) || 0) / 100);
  const total = sub - disc + taxed;
  const due = total - (Number(job.deposit) || 0);
  return { sub, disc, taxed, total, due };
}

// Inspection diagram uses the exact line-art template at /public/car-template.svg.
// The template combines overhead, plan and side views in a single image; the
// drawing's native size is 1536×1179, so the canvas keeps that aspect ratio.
const TEMPLATE_RATIO = 1536 / 1179;

export function CarDiagram({
  view, marks, onAdd, onRemove, readonly = false,
}: {
  view: string; marks: Mark[];
  onAdd?: (p: { x: number; y: number; view: string }) => void;
  onRemove?: (id: string) => void;
  readonly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const click = (e: React.MouseEvent) => {
    if (readonly || !onAdd) return;
    const r = ref.current!.getBoundingClientRect();
    onAdd({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, view });
  };
  const vm = marks.filter((m) => m.view === view);
  return (
    <div ref={ref} onClick={click} style={{ position: "relative",
      cursor: readonly ? "default" : "crosshair",
      background: "#ffffff", border: "1px solid #d4dde2", borderRadius: 10,
      aspectRatio: String(TEMPLATE_RATIO), overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/car-template.svg" alt="Vehicle inspection diagram" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block",
          pointerEvents: "none", userSelect: "none" }} />
      {vm.map((m, idx) => (
        <button key={m.id}
          title={!readonly ? `${m.type}${m.note ? " — " + m.note : ""} (click to remove)` : undefined}
          onClick={!readonly && onRemove ? (e) => { e.stopPropagation(); onRemove(m.id); } : undefined}
          style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-50%)",
            width: 22, height: 22, borderRadius: "50%", border: "2px solid #ffffff",
            background: MARK_COLORS[m.type] || "#9ca3af",
            cursor: readonly ? "default" : "pointer",
            padding: 0, boxShadow: "0 1px 5px rgba(0,0,0,.25)", zIndex: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 9, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }}>
          {readonly ? idx + 1 : ""}
        </button>
      ))}
    </div>
  );
}

// ─── Shared print styles ──────────────────────────────────────────────────────
const pth = { padding: "7px 10px", textAlign: "left" as const, borderBottom: "2px solid #111", fontSize: 12 };
const ptd = { padding: "6px 10px", borderBottom: "1px solid #eee" };

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
      <span style={{ fontWeight: 700 }}>{k}</span>
      <span style={{ minWidth: 130, textAlign: "left" }}>{v}</span>
    </div>
  );
}

// ─── Print document: quote/invoice OR inspection sheet ────────────────────────
export function PrintDoc({ job, settings, mode = "quote" }: {
  job: Job; settings: Settings; mode?: "quote" | "inspection";
}) {
  const money = pkr;
  const c = calc(job);
  const isInvoice = job.status !== "Quote";
  const date = new Date(job.created_at).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  // ── Inspection Sheet ────────────────────────────────────────────────────────
  if (mode === "inspection") {
    const usedTypes = [...new Set(job.marks.map((m) => m.type))];
    return (
      <div id="printable" style={{ background: "#fff", color: "#111",
        padding: "28px 36px 36px", fontFamily: "'Roboto Mono',monospace" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "3px solid #111", paddingBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dex-logo.png" alt="DEX" style={{ height: 64, objectFit: "contain" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 3,
              fontFamily: "'Oswald',sans-serif" }}>VEHICLE INSPECTION REPORT</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>
              {[settings.phone, settings.address].filter(Boolean).join("  ·  ")}
            </div>
          </div>
        </div>

        {/* Customer + Vehicle info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
          margin: "16px 0 14px", fontSize: 12 }}>
          <div style={{ borderRight: "1px solid #e5e7eb", paddingRight: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
              color: "#888", marginBottom: 6 }}>Customer</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{job.customer.name || "—"}</div>
            {job.customer.phone && (
              <div style={{ marginTop: 3, color: "#555" }}>📱 {job.customer.phone}</div>
            )}
            {job.customer.email && (
              <div style={{ color: "#555" }}>{job.customer.email}</div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
              color: "#888", marginBottom: 6 }}>Vehicle</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {[job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(Boolean).join(" ") || "—"}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 3, color: "#555", flexWrap: "wrap" }}>
              {job.vehicle.plate && <span><b>Plate:</b> {job.vehicle.plate}</span>}
              {job.vehicle.color && <span><b>Color:</b> {job.vehicle.color}</span>}
              {job.vehicle.vin   && <span><b>VIN:</b> {job.vehicle.vin}</span>}
              <span><b>Date:</b> {date}</span>
              {job.scheduled_date && (
                <span><b>Booked:</b> {new Date(job.scheduled_date + "T00:00:00")
                  .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                }</span>
              )}
            </div>
          </div>
        </div>

        {/* Damage / Work Map */}
        <div style={{ border: "1.5px solid #222", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
            color: "#444", marginBottom: 8 }}>Damage / Work Map</div>

          <CarDiagram view="diagram" marks={job.marks} readonly />

          {/* Legend — only types present in marks */}
          {usedTypes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 16px", marginTop: 10, fontSize: 11 }}>
              {usedTypes.map((type) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%",
                    background: MARK_COLORS[type], display: "inline-block", flexShrink: 0,
                    border: "1.5px solid rgba(0,0,0,.12)" }} />
                  <b>{type}</b>
                  <span style={{ color: "#666" }}>{DEX_CODES[type]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Damage details table */}
        {job.marks.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
              color: "#444", marginBottom: 6 }}>Damage Details</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ ...pth, width: 28, textAlign: "center" }}>#</th>
                  <th style={{ ...pth, width: 46 }}>Code</th>
                  <th style={pth}>Description</th>
                  <th style={{ ...pth, width: 70, textAlign: "center" }}>Sq. In.</th>
                  <th style={pth}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {job.marks.map((m, i) => (
                  <tr key={m.id}>
                    <td style={{ ...ptd, textAlign: "center", fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ ...ptd }}>
                      <span style={{ fontWeight: 700, color: MARK_COLORS[m.type] }}>{m.type}</span>
                    </td>
                    <td style={ptd}>{DEX_CODES[m.type]}</td>
                    <td style={{ ...ptd, textAlign: "center" }}>{m.sqin ?? "—"}</td>
                    <td style={ptd}>{m.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inspection notes */}
        {job.notes && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px",
            marginBottom: 14, fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
              color: "#444", marginBottom: 6 }}>Inspection Notes</div>
            <div style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{job.notes}</div>
          </div>
        )}

        {/* Signature boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28, marginTop: 36, fontSize: 12 }}>
          {["Customer Signature", "Technician / Estimator", "Date"].map((label) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ height: 40, borderBottom: "1.5px solid #111" }} />
              <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, fontSize: 11, color: "#888", borderTop: "1px solid #eee", paddingTop: 10,
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>By Al-Khair Enterprise</span>
          {settings.phone   && <span>{settings.phone}</span>}
          {settings.address && <span>{settings.address}</span>}
        </div>
      </div>
    );
  }

  // ── Quote / Invoice ─────────────────────────────────────────────────────────
  const docLabel = job.status === "Paid" ? "RECEIPT" : isInvoice ? "INVOICE" : "QUOTE / ESTIMATE";

  return (
    <div id="printable" style={{ background: "#fff", color: "#111", borderRadius: 10, padding: 36,
      marginTop: 18, fontFamily: "'Roboto Mono',monospace" }}>

      {/* DEX header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        borderBottom: "2px solid #111", paddingBottom: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dex-logo.png" alt="DEX" style={{ height: 84, maxWidth: "50%", objectFit: "contain" }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3,
            fontFamily: "'Oswald',sans-serif", color: "#e3000f" }}>{docLabel}</div>
          {job.scheduled_date && (
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              Booking: {new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-GB",
                { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "20px 0", fontSize: 13 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{isInvoice ? "Invoice To:" : "Estimate For:"}</div>
          <div style={{ fontWeight: 700, fontStyle: "italic", textDecoration: "underline", marginTop: 4 }}>
            {job.customer.name || "—"}</div>
          {job.customer.phone && <div style={{ color: "#555" }}>{job.customer.phone}</div>}
          {job.customer.email && <div style={{ color: "#555" }}>{job.customer.email}</div>}
        </div>
        <div style={{ fontSize: 13 }}>
          <Row k="Vehicle Reg#" v={job.vehicle.plate || "—"} />
          <Row k="Vehicle Model" v={[job.vehicle.make, job.vehicle.model].filter(Boolean).join(" ") || "—"} />
          {job.vehicle.color && <Row k="Color" v={job.vehicle.color} />}
          <Row k="Date" v={date} />
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>
          <th style={{ ...pth, textDecoration: "underline" }}>Item</th>
          <th style={{ ...pth, width: 60, textAlign: "center", textDecoration: "underline" }}>Qty</th>
          <th style={{ ...pth, textAlign: "right", textDecoration: "underline" }}>Amount</th>
        </tr></thead>
        <tbody>
          {job.line_items.length === 0 && (
            <tr><td style={ptd} colSpan={3}>—</td></tr>
          )}
          {job.line_items.map((li) => (
            <tr key={li.id}>
              <td style={ptd}>{li.desc || li.type}</td>
              <td style={{ ...ptd, textAlign: "center" }}>{li.qty > 1 ? li.qty : ""}</td>
              <td style={{ ...ptd, textAlign: "right" }}>{money((li.qty || 0) * (li.price || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <table style={{ fontSize: 13, minWidth: 280 }}><tbody>
          {(c.disc > 0 || Number(job.tax_rate) > 0 || Number(job.deposit) > 0) &&
            <tr><td style={ptd}>Subtotal</td><td style={{ ...ptd, textAlign: "right" }}>{money(c.sub)}</td></tr>}
          {c.disc > 0 &&
            <tr><td style={ptd}>Discount</td><td style={{ ...ptd, textAlign: "right" }}>−{money(c.disc)}</td></tr>}
          {Number(job.tax_rate) > 0 &&
            <tr><td style={ptd}>GST ({job.tax_rate}%)</td><td style={{ ...ptd, textAlign: "right" }}>{money(c.taxed)}</td></tr>}
          <tr style={{ fontWeight: 700, borderTop: "2px solid #111", fontSize: 17 }}>
            <td style={{ ...ptd, paddingTop: 10 }}>Grand Total</td>
            <td style={{ ...ptd, textAlign: "right", paddingTop: 10 }}>{money(c.total)}</td>
          </tr>
          {Number(job.deposit) > 0 && <>
            <tr><td style={ptd}>Deposit paid</td><td style={{ ...ptd, textAlign: "right" }}>−{money(job.deposit)}</td></tr>
            <tr style={{ fontWeight: 700 }}>
              <td style={ptd}>Balance Due</td><td style={{ ...ptd, textAlign: "right" }}>{money(c.due)}</td>
            </tr>
          </>}
        </tbody></table>
      </div>

      {job.notes && (
        <div style={{ marginTop: 16, fontSize: 12, color: "#555", lineHeight: 1.7 }}>
          <b>Notes:</b> {job.notes}
        </div>
      )}

      {/* Signature + footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 48 }}>
        <div style={{ fontSize: 12 }}>Thank you for your business!</div>
        <div style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dex-logo.png" alt="DEX" style={{ height: 34, objectFit: "contain" }} />
          <div style={{ borderTop: "2px solid #e3000f", width: 180, marginTop: 2, paddingTop: 3,
            fontSize: 11, color: "#555" }}>Authorized Signed</div>
        </div>
      </div>
      <div style={{ marginTop: 18, fontSize: 11, color: "#666", borderTop: "1px solid #eee", paddingTop: 10,
        display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span>By Al-Khair Enterprise</span>
        {settings.phone   && <span>{settings.phone}</span>}
        {settings.address && <span>{settings.address}</span>}
      </div>
      {!isInvoice && (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, fontWeight: 700 }}>
          This Inspection And Estimate Is Valid For 7 Days Only
        </div>
      )}
    </div>
  );
}
