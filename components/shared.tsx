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

// Colour palette — clean schematic matching the reference image
const CAR = {
  body:   "#f5f7f8",   // near-white body
  glass:  "#96b2bc",   // blue-gray glass (shaded like reference)
  roof:   "#b8ccd4",   // cabin area in top-down view
  trim:   "#e0e8ec",   // bumpers / B-pillar
  wheel:  "#4e6068",   // dark tyre
  hub:    "#b4c4ca",   // wheel hub ring
  stroke: "#3a4850",   // all outlines
};

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
  const s = CAR.stroke;
  const sw = "1.5";
  return (
    <div ref={ref} onClick={click} style={{ position: "relative", cursor: "crosshair",
      background: "#ffffff", border: "1px solid #d4dde2", borderRadius: 10, aspectRatio: "16/9" }}>
      <svg viewBox="0 0 320 180" style={{ width: "100%", height: "100%", display: "block" }}
        strokeLinecap="round" strokeLinejoin="round">

        {/* ── TOP VIEW ── overhead, front = left, rear = right */}
        {view === "top" && <>
          {/* Body with concave wheel-arch indentations on top and bottom sides */}
          <path fill={CAR.body} stroke={s} strokeWidth={sw}
            d="M 22,76 Q 16,84 16,90 Q 16,96 22,104
               L 40,120 Q 54,130 66,132 Q 72,126 78,132
               L 242,132 Q 248,126 254,132 Q 266,130 280,122
               L 298,104 Q 304,96 304,90 Q 304,84 298,76
               L 280,58 Q 266,50 254,48 Q 248,54 242,48
               L 78,48 Q 72,54 66,48 Q 54,50 40,60 Z" />
          {/* Windshield glass (front trapezoid) */}
          <path fill={CAR.glass} stroke={s} strokeWidth="1"
            d="M 40,60 L 40,120 L 82,132 L 82,48 Z" />
          {/* Cabin roof panel */}
          <rect fill={CAR.roof} stroke={s} strokeWidth="1" x="82" y="48" width="156" height="84" />
          {/* Rear glass trapezoid */}
          <path fill={CAR.glass} stroke={s} strokeWidth="1"
            d="M 238,48 L 238,132 L 280,122 L 280,58 Z" />
          {/* B-pillar */}
          <line stroke={s} strokeWidth="1.5" x1="160" y1="48" x2="160" y2="132" />
          {/* Mirrors */}
          <rect fill={CAR.trim} stroke={s} strokeWidth="0.8" x="72" y="34" width="22" height="14" rx="3" />
          <rect fill={CAR.trim} stroke={s} strokeWidth="0.8" x="72" y="132" width="22" height="14" rx="3" />
          {/* Wheels (4 corners, seen from above as short ellipses) */}
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="66" cy="62" rx="16" ry="9" />
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="66" cy="118" rx="16" ry="9" />
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="254" cy="62" rx="16" ry="9" />
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="254" cy="118" rx="16" ry="9" />
        </>}

        {/* ── SIDE VIEW ── left = normal, right = mirrored */}
        {(view === "left" || view === "right") && <>
          <g transform={view === "right" ? "translate(320,0) scale(-1,1)" : undefined}>
            {/* Body — ground y=170, wheel arch cubic beziers peak at y=135 (wheel top) */}
            <path fill={CAR.body} stroke={s} strokeWidth={sw}
              d="M 18,170 L 14,158 Q 12,142 16,128 Q 20,112 34,102
                 L 56,84 Q 78,62 98,56 L 110,42 Q 122,38 134,38
                 L 210,38 Q 224,38 234,52 L 254,76
                 Q 262,92 266,110 L 270,130 Q 274,150 278,162 L 282,170
                 L 263,170 C 263,135 229,135 229,170
                 L 94,170 C 94,135 60,135 60,170 Z" />
            {/* Windshield glass */}
            <path fill={CAR.glass} stroke={s} strokeWidth="1"
              d="M 98,80 L 110,42 Q 122,38 134,38 L 134,80 Z" />
            {/* Front door glass */}
            <rect fill={CAR.glass} stroke={s} strokeWidth="1" x="134" y="38" width="38" height="42" rx="1" />
            {/* B-pillar */}
            <rect fill={CAR.trim} stroke={s} strokeWidth="0.8" x="172" y="38" width="6" height="42" />
            {/* Rear door glass */}
            <rect fill={CAR.glass} stroke={s} strokeWidth="1" x="178" y="38" width="32" height="42" rx="1" />
            {/* Rear glass (C-pillar triangle) */}
            <path fill={CAR.glass} stroke={s} strokeWidth="1"
              d="M 210,38 Q 224,38 234,52 L 252,80 L 210,80 Z" />
            {/* Belt line */}
            <line stroke={s} strokeWidth="0.8" x1="98" y1="80" x2="252" y2="80" />
            {/* Door gap below belt */}
            <line stroke={s} strokeWidth="0.7" x1="175" y1="80" x2="175" y2="134" />
            {/* Rocker panel */}
            <line stroke={s} strokeWidth="0.8" x1="48" y1="134" x2="262" y2="134" />
            {/* Door handles */}
            <rect fill="#ffffff" stroke={s} strokeWidth="0.7" x="147" y="108" width="18" height="5" rx="2" />
            <rect fill="#ffffff" stroke={s} strokeWidth="0.7" x="191" y="108" width="18" height="5" rx="2" />
            {/* Front wheel */}
            <circle fill={CAR.wheel} stroke={s} strokeWidth={sw} cx="77"  cy="152" r="17" />
            <circle fill={CAR.hub}   stroke={s} strokeWidth="1"   cx="77"  cy="152" r="8" />
            <circle fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="77"  cy="152" r="3" />
            {/* Rear wheel */}
            <circle fill={CAR.wheel} stroke={s} strokeWidth={sw} cx="246" cy="152" r="17" />
            <circle fill={CAR.hub}   stroke={s} strokeWidth="1"   cx="246" cy="152" r="8" />
            <circle fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="246" cy="152" r="3" />
          </g>
        </>}

        {/* ── FRONT VIEW ── head-on */}
        {view === "front" && <>
          {/* Body silhouette */}
          <path fill={CAR.body} stroke={s} strokeWidth={sw}
            d="M 82,162 L 80,110 Q 82,72 98,60 L 116,48 Q 138,36 160,34
               Q 182,36 204,48 L 222,60 Q 238,72 240,110 L 238,162 Z" />
          {/* Hood / upper nose panel */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M 98,60 L 116,48 Q 138,36 160,34 Q 182,36 204,48 L 222,60
               L 214,72 Q 188,80 160,80 Q 132,80 106,72 Z" />
          {/* Windshield */}
          <path fill={CAR.glass} stroke={s} strokeWidth="1"
            d="M 106,72 Q 132,80 160,80 Q 188,80 214,72
               L 214,110 Q 190,116 160,116 Q 130,116 106,110 Z" />
          {/* Left headlight housing */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M 80,100 L 80,128 Q 82,136 92,138 L 114,138
               Q 122,136 122,128 L 122,100 Q 106,94 80,100 Z" />
          <path fill={CAR.glass} stroke={s} strokeWidth="0.8"
            d="M 84,104 L 84,126 Q 86,130 94,132 L 112,132
               L 118,126 L 118,104 Q 104,100 84,104 Z" />
          {/* Right headlight housing */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M 240,100 L 240,128 Q 238,136 228,138 L 206,138
               Q 198,136 198,128 L 198,100 Q 214,94 240,100 Z" />
          <path fill={CAR.glass} stroke={s} strokeWidth="0.8"
            d="M 236,104 L 236,126 Q 234,130 226,132 L 208,132
               L 202,126 L 202,104 Q 216,100 236,104 Z" />
          {/* Grille */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M 124,118 L 136,114 L 184,114 L 196,118 L 194,138
               Q 160,144 126,138 Z" />
          <line stroke={s} strokeWidth="0.6" x1="128" y1="125" x2="192" y2="125" />
          <line stroke={s} strokeWidth="0.6" x1="126" y1="133" x2="194" y2="133" />
          <line stroke={s} strokeWidth="0.6" x1="160" y1="114" x2="160" y2="140" />
          {/* Bumper */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M 82,148 L 80,162 Q 84,170 102,172 L 218,172
               Q 236,170 240,162 L 238,148 Z" />
          {/* License plate */}
          <rect fill={CAR.hub} stroke={s} strokeWidth="0.7" x="140" y="152" width="40" height="14" rx="2" />
          {/* Mirrors */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M 62,84 L 80,82 L 80,92 L 64,94 Q 58,92 62,84 Z" />
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M 258,84 L 240,82 L 240,92 L 256,94 Q 262,92 258,84 Z" />
          {/* Wheel arches + frontal tyres */}
          <path fill={CAR.wheel} stroke={s} strokeWidth="1"
            d="M 82,150 Q 82,172 104,174 L 122,174 Q 100,164 92,150 Z" />
          <path fill={CAR.wheel} stroke={s} strokeWidth="1"
            d="M 238,150 Q 238,172 216,174 L 198,174 Q 220,164 228,150 Z" />
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="1"   cx="108" cy="172" rx="26" ry="8" />
          <ellipse fill={CAR.hub}   stroke={s} strokeWidth="0.8" cx="108" cy="172" rx="13" ry="4" />
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="1"   cx="212" cy="172" rx="26" ry="8" />
          <ellipse fill={CAR.hub}   stroke={s} strokeWidth="0.8" cx="212" cy="172" rx="13" ry="4" />
        </>}

      </svg>
      {vm.map((m) => (
        <button key={m.id} title={`${m.type}${m.note ? " — " + m.note : ""} (click to remove)`}
          onClick={(e) => { e.stopPropagation(); onRemove(m.id); }}
          style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-50%)",
            width: 20, height: 20, borderRadius: "50%", border: "2.5px solid #ffffff",
            background: MARK_COLORS[m.type] || "#9ca3af", cursor: "pointer", padding: 0,
            boxShadow: "0 1px 5px rgba(0,0,0,.25)", zIndex: 1 }} />
      ))}
      <span style={{ position: "absolute", bottom: 6, left: 10, fontSize: 10, letterSpacing: 1.5,
        textTransform: "uppercase", color: "#94a3b8", fontWeight: 600 }}>{view}</span>
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
