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

// Colour palette used across all car diagram views
const CAR = { body: "#dde6f0", glass: "#aec6dc", trim: "#c8d4e2", wheel: "#8298ae", hub: "#e8ecf2", stroke: "#5a7080" };

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
      background: "#f0f4f8", border: "1px solid #dde3ec", borderRadius: 10, aspectRatio: "16/9" }}>
      <svg viewBox="0 0 320 180" style={{ width: "100%", height: "100%", display: "block" }}
        strokeLinecap="round" strokeLinejoin="round">

        {/* ── TOP VIEW ── looking straight down, front at top */}
        {view === "top" && <>
          {/* Body outline with wheel-arch bumps on left and right */}
          <path fill={CAR.body} stroke={s} strokeWidth={sw}
            d="M118 18 Q160 15 202 18 L232 28 Q252 44 254 56
               Q262 56 264 66 Q262 76 254 76
               L254 96
               Q262 96 264 106 Q262 116 254 116
               Q252 136 232 152 L202 162 Q160 165 118 162 L88 152
               Q68 136 66 116
               Q58 116 56 106 Q58 96 66 96
               L66 76
               Q58 76 56 66 Q58 56 66 56
               Q68 44 88 28 Z" />
          {/* Windshield from above (front trapezoid) */}
          <path fill={CAR.glass} stroke={s} strokeWidth="1"
            d="M96 74 L108 54 L212 54 L224 74 Z" />
          {/* Cabin roof */}
          <rect fill={CAR.trim} stroke={s} strokeWidth="1" x="96" y="74" width="128" height="38" rx="2" />
          {/* Rear glass from above */}
          <path fill={CAR.glass} stroke={s} strokeWidth="1"
            d="M96 112 L108 132 L212 132 L224 112 Z" />
          {/* Hood crease */}
          <line stroke={s} strokeWidth="1" x1="110" y1="44" x2="210" y2="44" />
          {/* Trunk crease */}
          <line stroke={s} strokeWidth="1" x1="110" y1="146" x2="210" y2="146" />
          {/* Mirrors */}
          <rect fill={CAR.trim} stroke={s} strokeWidth="0.8" x="84" y="66" width="14" height="8" rx="2" />
          <rect fill={CAR.trim} stroke={s} strokeWidth="0.8" x="222" y="66" width="14" height="8" rx="2" />
        </>}

        {/* ── SIDE VIEW ── left=normal, right=mirrored */}
        {(view === "left" || view === "right") && <>
          <g transform={view === "right" ? "translate(320,0) scale(-1,1)" : undefined}>
            {/* Body — ground at y=152, wheel arches cut in via cubic bezier */}
            <path fill={CAR.body} stroke={s} strokeWidth={sw}
              d="M18 148 L18 114 Q24 88 52 80 L78 52
                 Q92 30 112 28 L196 28
                 Q228 30 248 56 L262 82
                 Q272 108 272 126 L290 126
                 Q294 148 282 152
                 L254 152
                 C 254 93 202 93 202 152
                 L114 152
                 C 114 93 62 93 62 152
                 Z" />
            {/* Windshield glass */}
            <path fill={CAR.glass} stroke={s} strokeWidth="1"
              d="M78 52 Q92 30 112 28 L112 82 Q96 84 78 96 Z" />
            {/* Front door glass */}
            <rect fill={CAR.glass} stroke={s} strokeWidth="1" x="112" y="28" width="42" height="54" rx="2" />
            {/* B-pillar */}
            <rect fill={CAR.trim} stroke={s} strokeWidth="1" x="154" y="28" width="7" height="54" />
            {/* Rear door glass */}
            <rect fill={CAR.glass} stroke={s} strokeWidth="1" x="161" y="28" width="35" height="54" rx="2" />
            {/* Rear glass */}
            <path fill={CAR.glass} stroke={s} strokeWidth="1"
              d="M196 28 Q228 30 248 56 L243 82 L196 82 Z" />
            {/* Belt line */}
            <line stroke={s} strokeWidth="1" x1="78" y1="96" x2="245" y2="82" />
            {/* Door handles */}
            <rect fill={CAR.hub} stroke={s} strokeWidth="0.8" x="126" y="114" width="20" height="7" rx="3" />
            <rect fill={CAR.hub} stroke={s} strokeWidth="0.8" x="165" y="114" width="20" height="7" rx="3" />
            {/* Front wheel */}
            <circle fill={CAR.wheel} stroke={s} strokeWidth={sw} cx="88" cy="130" r="22" />
            <circle fill={CAR.trim} stroke={s} strokeWidth="1" cx="88" cy="130" r="11" />
            <circle fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="88" cy="130" r="4" />
            {/* Rear wheel */}
            <circle fill={CAR.wheel} stroke={s} strokeWidth={sw} cx="228" cy="130" r="22" />
            <circle fill={CAR.trim} stroke={s} strokeWidth="1" cx="228" cy="130" r="11" />
            <circle fill={CAR.wheel} stroke={s} strokeWidth="0.8" cx="228" cy="130" r="4" />
            {/* Front bumper detail */}
            <path fill={CAR.trim} stroke={s} strokeWidth="1"
              d="M18 114 Q18 130 22 138 L40 138 Q36 118 36 108 Z" />
            {/* Rear bumper detail */}
            <path fill={CAR.trim} stroke={s} strokeWidth="1"
              d="M272 126 L288 126 Q294 138 290 148 L278 148 Q274 138 272 128 Z" />
            {/* Rocker panel line */}
            <line stroke={s} strokeWidth="0.8" x1="40" y1="128" x2="270" y2="128" />
          </g>
        </>}

        {/* ── FRONT VIEW ── head-on, car facing the viewer */}
        {view === "front" && <>
          {/* Main body */}
          <path fill={CAR.body} stroke={s} strokeWidth={sw}
            d="M80 155 L80 98 Q82 66 98 56 L116 46 Q138 30 160 28
               Q182 30 204 46 L222 56 Q238 66 240 98
               L240 155 Z" />
          {/* Hood panel (top of body, above headlights) */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M98 56 L116 46 Q138 30 160 28 Q182 30 204 46 L222 56
               L212 68 Q160 74 108 68 Z" />
          {/* Windshield */}
          <path fill={CAR.glass} stroke={s} strokeWidth="1"
            d="M108 68 Q116 62 132 60 L188 60 Q204 62 212 68
               L212 104 Q188 110 160 110 Q132 110 108 104 Z" />
          {/* Left headlight cluster */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M80 98 L80 122 Q82 130 90 132 L114 132 Q120 130 120 122 L120 100
               Q106 95 80 98 Z" />
          <path fill={CAR.glass} stroke={s} strokeWidth="0.8"
            d="M84 102 L84 120 Q86 126 92 128 L114 128 L116 122 L116 104
               Q104 99 84 102 Z" />
          {/* Right headlight cluster */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M240 98 L240 122 Q238 130 230 132 L206 132 Q200 130 200 122 L200 100
               Q214 95 240 98 Z" />
          <path fill={CAR.glass} stroke={s} strokeWidth="0.8"
            d="M236 102 L236 120 Q234 126 228 128 L206 128 L204 122 L204 104
               Q216 99 236 102 Z" />
          {/* Grille opening */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M120 114 L136 110 L184 110 L200 114 L196 134 Q160 140 124 134 Z" />
          {/* Grille slats */}
          <line stroke={s} strokeWidth="0.6" x1="126" y1="122" x2="194" y2="122" />
          <line stroke={s} strokeWidth="0.6" x1="124" y1="130" x2="196" y2="130" />
          <line stroke={s} strokeWidth="0.6" x1="160" y1="110" x2="160" y2="138" />
          <line stroke={s} strokeWidth="0.6" x1="145" y1="110" x2="143" y2="136" />
          <line stroke={s} strokeWidth="0.6" x1="175" y1="110" x2="177" y2="136" />
          {/* Bumper bar */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M80 142 L80 155 Q84 164 100 166 L220 166 Q236 164 240 155 L240 142 Z" />
          {/* License plate */}
          <rect fill={CAR.hub} stroke={s} strokeWidth="0.8" x="140" y="148" width="40" height="14" rx="2" />
          {/* Mirrors */}
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M62 82 L80 80 L80 90 L64 92 Q60 90 62 82 Z" />
          <path fill={CAR.trim} stroke={s} strokeWidth="1"
            d="M258 82 L240 80 L240 90 L256 92 Q260 90 258 82 Z" />
          {/* Wheel arches at bottom */}
          <path fill={CAR.wheel} stroke={s} strokeWidth="1"
            d="M80 148 Q80 168 100 170 L118 170 Q96 162 88 148 Z" />
          <path fill={CAR.wheel} stroke={s} strokeWidth="1"
            d="M240 148 Q240 168 220 170 L202 170 Q224 162 232 148 Z" />
          {/* Wheel centres visible behind arches */}
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="1" cx="108" cy="168" rx="24" ry="8" />
          <ellipse fill={CAR.hub} stroke={s} strokeWidth="0.8" cx="108" cy="168" rx="12" ry="4" />
          <ellipse fill={CAR.wheel} stroke={s} strokeWidth="1" cx="212" cy="168" rx="24" ry="8" />
          <ellipse fill={CAR.hub} stroke={s} strokeWidth="0.8" cx="212" cy="168" rx="12" ry="4" />
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
