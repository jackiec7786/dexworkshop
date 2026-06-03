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
  created_at: string;
};
export type Settings = {
  biz_name: string; tagline: string; phone: string; email: string;
  address: string; currency: string; tax_rate: number;
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

export function CarDiagram({
  view, marks, onAdd, onRemove,
}: {
  view: string; marks: Mark[];
  onAdd: (p: { x: number; y: number; view: string }) => void;
  onRemove: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const click = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onAdd({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, view });
  };
  const vm = marks.filter((m) => m.view === view);
  return (
    <div ref={ref} onClick={click} style={{ position: "relative", cursor: "crosshair",
      background: "#16181c", border: "1px solid #2a2e35", borderRadius: 8, aspectRatio: "16/9" }}>
      <svg viewBox="0 0 320 180" style={{ width: "100%", height: "100%", display: "block" }}>
        <g fill="none" stroke="#444b54" strokeWidth="2">
          {view === "top" ? (
            <>
              <rect x="70" y="20" width="180" height="140" rx="34" />
              <line x1="70" y1="62" x2="250" y2="62" /><line x1="70" y1="118" x2="250" y2="118" />
              <rect x="108" y="66" width="104" height="48" rx="8" />
            </>
          ) : view === "left" || view === "right" ? (
            <>
              <path d="M30 120 Q30 95 60 92 L95 60 Q110 48 150 48 L215 48 Q245 50 260 78 L290 90 Q298 100 290 120 Z" />
              <circle cx="92" cy="120" r="16" /><circle cx="240" cy="120" r="16" />
              <path d="M110 60 L150 56 L150 88 L100 88 Z" /><path d="M158 56 L210 54 L240 86 L158 88 Z" />
            </>
          ) : (
            <>
              <rect x="95" y="28" width="130" height="124" rx="20" />
              <rect x="110" y="40" width="100" height="38" rx="6" />
              <circle cx="120" cy="100" r="8" /><circle cx="200" cy="100" r="8" />
            </>
          )}
        </g>
      </svg>
      {vm.map((m) => (
        <button key={m.id} title={`${m.type}${m.note ? " — " + m.note : ""} (click to remove)`}
          onClick={(e) => { e.stopPropagation(); onRemove(m.id); }}
          style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-50%)",
            width: 18, height: 18, borderRadius: "50%", border: "2px solid #0c0d0f",
            background: MARK_COLORS[m.type] || "#fff", cursor: "pointer", padding: 0,
            boxShadow: "0 0 0 2px rgba(255,255,255,.15)" }} />
      ))}
      <span style={{ position: "absolute", bottom: 6, left: 8, fontSize: 10, letterSpacing: 1,
        textTransform: "uppercase", color: "#5f6671" }}>{view}</span>
    </div>
  );
}

export function PrintDoc({ job, settings }: { job: Job; settings: Settings }) {
  const money = pkr; // Pakistani format: 8,500/-
  const c = calc(job);
  const isInvoice = job.status !== "Quote";
  const date = new Date(job.created_at).toLocaleDateString("en-GB");
  return (
    <div id="printable" style={{ background: "#fff", color: "#111", borderRadius: 10, padding: 36,
      marginTop: 18, fontFamily: "'Roboto Mono',monospace" }}>
      {/* DEX header: real logo (includes the services line) */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #111", paddingBottom: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dex-logo.png" alt="DEX" style={{ height: 84, maxWidth: "100%", objectFit: "contain" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "20px 0", fontSize: 13 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{isInvoice ? "Invoice To:" : "Estimate For:"}</div>
          <div style={{ fontWeight: 700, fontStyle: "italic", textDecoration: "underline", marginTop: 4 }}>
            {job.customer.name || "—"}</div>
          {job.customer.phone && <div style={{ color: "#555" }}>{job.customer.phone}</div>}
        </div>
        <div style={{ fontSize: 13 }}>
          <Row k="Vehicle Reg#" v={job.vehicle.plate || "—"} />
          <Row k="Vehicle Model" v={[job.vehicle.make, job.vehicle.model].filter(Boolean).join(" ") || "—"} />
          <Row k="Date" v={date} />
          {job.vehicle.color && <Row k="Color" v={job.vehicle.color} />}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>
          <th style={{ ...pth, textDecoration: "underline" }}>Item</th>
          <th style={{ ...pth, textAlign: "right", textDecoration: "underline" }}>Amount</th></tr></thead>
        <tbody>
          {job.line_items.length === 0 && <tr><td style={ptd}>—</td><td style={ptd}></td></tr>}
          {job.line_items.map((li) => (
            <tr key={li.id}>
              <td style={ptd}>{li.desc || li.type}{li.qty > 1 ? ` ×${li.qty}` : ""}</td>
              <td style={{ ...ptd, textAlign: "right" }}>{money((li.qty || 0) * (li.price || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <table style={{ fontSize: 13, minWidth: 260 }}><tbody>
          {(c.disc > 0 || Number(job.tax_rate) > 0 || Number(job.deposit) > 0) &&
            <tr><td style={ptd}>Subtotal</td><td style={{ ...ptd, textAlign: "right" }}>{money(c.sub)}</td></tr>}
          {c.disc > 0 && <tr><td style={ptd}>Discount</td><td style={{ ...ptd, textAlign: "right" }}>−{money(c.disc)}</td></tr>}
          {Number(job.tax_rate) > 0 && <tr><td style={ptd}>GST ({job.tax_rate}%)</td><td style={{ ...ptd, textAlign: "right" }}>{money(c.taxed)}</td></tr>}
          <tr style={{ fontWeight: 700, borderTop: "2px solid #111", fontSize: 17 }}>
            <td style={{ ...ptd, paddingTop: 10 }}>Grand Total</td>
            <td style={{ ...ptd, textAlign: "right", paddingTop: 10 }}>{money(c.total)}</td></tr>
          {Number(job.deposit) > 0 && <>
            <tr><td style={ptd}>Deposit paid</td><td style={{ ...ptd, textAlign: "right" }}>−{money(job.deposit)}</td></tr>
            <tr style={{ fontWeight: 700 }}>
              <td style={ptd}>Balance Due</td><td style={{ ...ptd, textAlign: "right" }}>{money(c.due)}</td></tr></>}
        </tbody></table>
      </div>

      {job.notes && <div style={{ marginTop: 16, fontSize: 12, color: "#555" }}><b>Notes:</b> {job.notes}</div>}

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
        <span>{settings.phone}</span>
        <span>{settings.address}</span>
      </div>
      {!isInvoice && <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, fontWeight: 700 }}>
        This Inspection And Estimate Is Valid For 7 Days Only</div>}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (<div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
    <span style={{ fontWeight: 700 }}>{k}</span><span style={{ minWidth: 130, textAlign: "left" }}>{v}</span></div>);
}
const pth = { padding: "8px 10px", textAlign: "left" as const, borderBottom: "2px solid #111", fontSize: 12 };
const ptd = { padding: "7px 10px", borderBottom: "1px solid #eee" };
