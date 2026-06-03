"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Job, Settings, SERVICE_TYPES, MARK_COLORS, DEX_CODES, CODE_KEYS, pkr, calc, CarDiagram, PrintDoc,
} from "@/components/shared";
import { Spinner, tokens, useToast, useConfirm } from "@/components/ui";

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"inspection" | "quote">("inspection");
  const [view, setView] = useState("top");
  const [activeType, setActiveType] = useState("DD");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    biz_name: "DEX", tagline: "TINT | WRAP | PDR | PPF | CUSTOMS", phone: "+92-321-443-2687",
    email: "", address: "68C 22nd Commercial St, D.H.A Phase II Extension, Karachi", currency: "Rs", tax_rate: 0,
  });
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Send the user back to /login if their session expired mid-session.
  const onAuthError = useCallback(() => { router.replace("/login"); }, [router]);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const [rJobs, rSettings, rStatus] = await Promise.all([
        fetch("/api/jobs"), fetch("/api/settings"), fetch("/api/auth/status"),
      ]);
      if (rJobs.status === 401) { onAuthError(); return; }
      if (!rJobs.ok) { setLoadError(true); return; }
      setJobs(await rJobs.json());
      if (rSettings.ok) { const s = await rSettings.json(); if (s) setSettings(s); }
      if (rStatus.ok) { const st = await rStatus.json(); setEmail(st.email ?? ""); }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const active = jobs.find((j) => j.id === activeId) || null;
  const cur = settings.currency || "Rs";
  const money = pkr;

  const saveJob = useCallback((job: Job) => {
    clearTimeout(saveTimers.current[job.id]);
    saveTimers.current[job.id] = setTimeout(async () => {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: job.status, customer: job.customer, vehicle: job.vehicle,
          marks: job.marks, line_items: job.line_items, notes: job.notes,
          discount: job.discount, tax_rate: job.tax_rate, deposit: job.deposit, photos: job.photos,
        }),
      });
      if (res.status === 401) onAuthError();
      else if (!res.ok) toast("Couldn't save changes.", "error");
    }, 600);
  }, [onAuthError, toast]);

  const updateActive = (mut: (j: Job) => Job) => {
    setJobs((prev) => prev.map((j) => {
      if (j.id !== activeId) return j;
      const next = mut(j); saveJob(next); return next;
    }));
  };

  const newJob = async () => {
    const res = await fetch("/api/jobs", { method: "POST" });
    if (res.status === 401) return onAuthError();
    if (!res.ok) return toast("Couldn't create job.", "error");
    const j: Job = await res.json();
    setJobs((p) => [j, ...p]); setActiveId(j.id); setTab("inspection"); setView("top");
  };

  const deleteJob = async (id: string) => {
    const ok = await confirm({
      title: "Delete this job?",
      message: "This permanently removes the inspection, quote and invoice for this job.",
      confirmText: "Delete", danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.status === 401) return onAuthError();
    if (!res.ok) return toast("Couldn't delete job.", "error");
    setJobs((p) => p.filter((j) => j.id !== id));
    if (activeId === id) setActiveId(null);
    toast("Job deleted.", "success");
  };

  const saveSettings = async () => {
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
    });
    if (res.status === 401) return onAuthError();
    if (!res.ok) return toast("Couldn't save settings.", "error");
    setShowSettings(false);
    toast("Settings saved.", "success");
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const uploadPhoto = async (file: File) => {
    if (!active) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobId", active.id);
    const res = await fetch("/api/photos", { method: "POST", body: formData });
    if (res.status === 401) return onAuthError();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast(data.error ?? "Upload failed.", "error");
    }
    const { url } = await res.json();
    updateActive((j) => ({ ...j, photos: [...j.photos, { url, caption: "" }] }));
    toast("Photo uploaded.", "success");
  };

  if (loading) return <Center><Spinner label="Loading workshop…" /></Center>;
  if (loadError) {
    return (
      <Center>
        <div style={{ textAlign: "center", display: "grid", gap: 14 }}>
          <div className="disp" style={{ fontSize: 22, color: tokens.danger }}>COULDN&apos;T LOAD WORKSHOP</div>
          <p style={{ color: tokens.muted, maxWidth: 320 }}>
            The server didn&apos;t respond. Check your connection and try again.
          </p>
          <button style={btn("#ff6a2b", "#0c0d0f")} onClick={load}>Retry</button>
        </div>
      </Center>
    );
  }

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || (j.customer.name || "").toLowerCase().includes(q) ||
      (j.vehicle.plate || "").toLowerCase().includes(q) ||
      `${j.vehicle.make} ${j.vehicle.model}`.toLowerCase().includes(q);
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="noprint" style={hdr}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dex-logo.png" alt="DEX" style={{ height: 32, objectFit: "contain" }} />
        <div style={{ flex: 1 }} />
        {email && <span style={{ fontSize: 12, color: tokens.faint, marginRight: 4 }}>{email}</span>}
        <button style={btn()} onClick={() => setShowSettings(true)}>⚙ Settings</button>
        <button style={btn()} onClick={signOut}>Sign out</button>
        <button style={btn("#ff6a2b", "#0c0d0f")} onClick={newJob}>+ New Job</button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "calc(100vh - 59px)" }}>
        <aside className="noprint" style={{ borderRight: "1px solid #1f2228", padding: 14, overflowY: "auto" }}>
          <input placeholder="Search name / plate / model…" value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ ...fld, marginBottom: 12 }} />
          <div style={{ fontSize: 11, color: "#7a818b", marginBottom: 8 }}>
            {filtered.length} job{filtered.length !== 1 ? "s" : ""}</div>
          {jobs.length === 0 && (
            <div style={{ fontSize: 12, color: tokens.faint, lineHeight: 1.6, padding: "8px 2px" }}>
              No jobs yet. Hit <b style={{ color: tokens.accent }}>+ New Job</b> to start your first inspection.
            </div>
          )}
          {filtered.map((j) => {
            const sel = j.id === activeId;
            const sc = { Quote: "#4fc3ff", Invoice: "#ffd24f", Paid: "#4fd97a" }[j.status];
            return (
              <div key={j.id} onClick={() => setActiveId(j.id)} style={{ padding: 11, borderRadius: 8,
                marginBottom: 8, cursor: "pointer", background: sel ? "#1c1f25" : "#131519",
                border: `1px solid ${sel ? "#ff6a2b" : "#1f2228"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{j.customer.name || "Unnamed"}</span>
                  <span style={{ fontSize: 10, color: sc, border: `1px solid ${sc}`, borderRadius: 4, padding: "1px 6px" }}>{j.status}</span>
                </div>
                <div style={{ fontSize: 12, color: "#9aa0a6", marginTop: 3 }}>
                  {[j.vehicle.year, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ") || "—"}
                  {j.vehicle.plate ? ` · ${j.vehicle.plate}` : ""}</div>
                <div style={{ fontSize: 12, color: "#7a818b", marginTop: 2 }}>{money(calc(j).total)}</div>
              </div>
            );
          })}
        </aside>

        <main style={{ padding: 22 }}>
          {!active ? (
            <div className="noprint" style={{ color: "#5f6671", display: "grid", placeItems: "center",
              height: "100%", textAlign: "center" }}>
              <div><div className="disp" style={{ fontSize: 28, color: "#2a2e35" }}>NO JOB SELECTED</div>
                <p style={{ maxWidth: 360 }}>Pick a job or create one. Each job carries one customer + vehicle
                through inspection, quote and invoice.</p></div>
            </div>
          ) : (
            <>
              <div className="noprint" style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
                {(["inspection", "quote"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    style={btn(tab === t ? "#ff6a2b" : "#1c1f25", tab === t ? "#0c0d0f" : "#9aa0a6")}>
                    {t === "inspection" ? "Inspection" : "Quote / Invoice"}</button>
                ))}
                <div style={{ flex: 1 }} />
                <select value={active.status} onChange={(e) => updateActive((j) => ({ ...j, status: e.target.value as Job["status"] }))}
                  style={{ ...fld, width: "auto" }}>
                  <option>Quote</option><option>Invoice</option><option>Paid</option></select>
                <button style={btn()} onClick={() => { setTab("quote"); setTimeout(() => window.print(), 80); }}>🖨 Print</button>
                <button style={btn("#2a1416", "#ff8080")} onClick={() => deleteJob(active.id)}>Delete</button>
              </div>

              {tab === "inspection" && (
                <div className="noprint">
                  <Section title="Customer"><div style={grid3}>
                    {(["name", "phone", "email"] as const).map((f) => (
                      <F key={f} label={f} value={active.customer[f] || ""}
                        onChange={(v) => updateActive((j) => ({ ...j, customer: { ...j.customer, [f]: v } }))} />))}
                  </div></Section>
                  <Section title="Vehicle"><div style={grid3}>
                    {(["year", "make", "model", "plate", "color", "vin"] as const).map((f) => (
                      <F key={f} label={f === "vin" ? "VIN" : f} value={active.vehicle[f] || ""}
                        onChange={(v) => updateActive((j) => ({ ...j, vehicle: { ...j.vehicle, [f]: v } }))} />))}
                  </div></Section>
                  <Section title="Damage / Work Map">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 10 }}>
                      {CODE_KEYS.map((code) => (
                        <button key={code} onClick={() => setActiveType(code)} title={DEX_CODES[code]}
                          style={{ ...btn(activeType === code ? MARK_COLORS[code] : "#1c1f25",
                            activeType === code ? "#0c0d0f" : "#c5cad1"), padding: "8px 0", fontSize: 13,
                            display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                          <span style={{ fontWeight: 700 }}>{code}</span></button>))}
                    </div>
                    <div style={{ fontSize: 11, color: "#7a818b", marginBottom: 12 }}>
                      Selected: <b style={{ color: MARK_COLORS[activeType] }}>{activeType}</b> — {DEX_CODES[activeType]}
                      <span style={{ marginLeft: 8, color: tokens.faint }}>· click the diagram to drop a mark</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {["top", "left", "right", "front"].map((v) => (
                        <button key={v} onClick={() => setView(v)} style={btn(view === v ? "#2a2e35" : "#131519")}>{v}</button>))}
                    </div>
                    <div style={{ maxWidth: 520 }}>
                      <CarDiagram view={view} marks={active.marks}
                        onAdd={(p) => updateActive((j) => ({ ...j, marks: [...j.marks,
                          { id: "m" + Date.now(), type: activeType, note: "", ...p }] }))}
                        onRemove={(id) => updateActive((j) => ({ ...j, marks: j.marks.filter((m) => m.id !== id) }))} />
                    </div>
                    {active.marks.length > 0 && (
                      <ul style={{ listStyle: "none", padding: 0, marginTop: 12, fontSize: 13 }}>
                        {active.marks.map((m) => (
                          <li key={m.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: MARK_COLORS[m.type] }} />
                            <b>{m.type}</b><span style={{ color: "#9aa0a6" }}>{DEX_CODES[m.type] || ""}</span>
                            <span style={{ color: "#7a818b" }}>· {m.view}</span>
                            <span style={{ flex: 1 }} />
                            <input type="number" placeholder="sq in" value={m.sqin ?? ""}
                              onChange={(e) => updateActive((j) => ({ ...j, marks: j.marks.map((x) =>
                                x.id === m.id ? { ...x, sqin: e.target.value ? Number(e.target.value) : undefined } : x) }))}
                              style={{ ...fld, width: 90, padding: "5px 8px", fontSize: 12 }} />
                            <button style={btn("#2a1416", "#ff8080")}
                              onClick={() => updateActive((j) => ({ ...j, marks: j.marks.filter((x) => x.id !== m.id) }))}>×</button>
                          </li>))}
                      </ul>
                    )}
                  </Section>
                  <Section title="Photos">
                    <input type="file" accept="image/*" capture="environment"
                      onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                      style={{ ...fld, padding: 8 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {active.photos.map((p) => (
                        <div key={p.url} style={{ position: "relative" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" style={{ width: 110, height: 80, objectFit: "cover", borderRadius: 6 }} />
                          <button onClick={() => updateActive((j) => ({ ...j, photos: j.photos.filter((x) => x.url !== p.url) }))}
                            style={{ position: "absolute", top: 2, right: 2, background: "#0c0d0fcc", color: "#ff8080",
                              border: "none", borderRadius: 4, cursor: "pointer", padding: "1px 6px" }}>×</button>
                        </div>))}
                    </div>
                  </Section>
                  <Section title="Inspection Notes">
                    <textarea style={{ ...fld, minHeight: 80, resize: "vertical" }} value={active.notes}
                      onChange={(e) => updateActive((j) => ({ ...j, notes: e.target.value }))}
                      placeholder="Pre-existing damage, customer concerns, condition…" />
                  </Section>
                </div>
              )}

              {tab === "quote" && (
                <>
                  <div className="noprint">
                    <Section title="Line Items">
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead><tr style={{ color: "#7a818b", textAlign: "left" }}>
                          <th style={th}>Description</th><th style={th}>Type</th>
                          <th style={{ ...th, width: 60 }}>Qty</th><th style={{ ...th, width: 110 }}>Price</th>
                          <th style={{ ...th, width: 110 }}>Total</th><th style={{ ...th, width: 40 }}></th></tr></thead>
                        <tbody>
                          {active.line_items.map((li) => (
                            <tr key={li.id}>
                              <td style={td}><input style={fld} value={li.desc}
                                onChange={(e) => editItem(li.id, "desc", e.target.value)} /></td>
                              <td style={td}><select style={fld} value={li.type}
                                onChange={(e) => editItem(li.id, "type", e.target.value)}>
                                {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></td>
                              <td style={td}><input style={fld} type="number" value={li.qty}
                                onChange={(e) => editItem(li.id, "qty", e.target.value)} /></td>
                              <td style={td}><input style={fld} type="number" value={li.price}
                                onChange={(e) => editItem(li.id, "price", e.target.value)} /></td>
                              <td style={{ ...td, color: "#9aa0a6" }}>{money((li.qty || 0) * (li.price || 0))}</td>
                              <td style={td}><button style={btn("#2a1416", "#ff8080")}
                                onClick={() => updateActive((j) => ({ ...j, line_items: j.line_items.filter((x) => x.id !== li.id) }))}>×</button></td>
                            </tr>))}
                        </tbody>
                      </table>
                      <button style={{ ...btn(), marginTop: 10 }} onClick={() => updateActive((j) => ({ ...j,
                        line_items: [...j.line_items, { id: "li" + Date.now(), desc: "", type: "PDR", qty: 1, price: 0 }] }))}>
                        + Add line</button>
                    </Section>
                    <Section title="Adjustments"><div style={grid3}>
                      <F label={`Discount (${cur})`} type="number" value={String(active.discount)}
                        onChange={(v) => updateActive((j) => ({ ...j, discount: Number(v) }))} />
                      <F label="GST %" type="number" value={String(active.tax_rate)}
                        onChange={(v) => updateActive((j) => ({ ...j, tax_rate: Number(v) }))} />
                      <F label={`Deposit Paid (${cur})`} type="number" value={String(active.deposit)}
                        onChange={(v) => updateActive((j) => ({ ...j, deposit: Number(v) }))} />
                    </div></Section>
                  </div>
                  <PrintDoc job={active} settings={settings} />
                </>
              )}
            </>
          )}
        </main>
      </div>

      {showSettings && (
        <div className="noprint" onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0,
          background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#131519", padding: 24, borderRadius: 12,
            width: 460, maxWidth: "90vw", border: "1px solid #2a2e35" }}>
            <h3 className="disp" style={{ margin: "0 0 16px", letterSpacing: 1 }}>WORKSHOP SETTINGS</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <F label="Business Name" value={settings.biz_name} onChange={(v) => setSettings({ ...settings, biz_name: v })} />
              <F label="Tagline" value={settings.tagline} onChange={(v) => setSettings({ ...settings, tagline: v })} />
              <div style={grid2}>
                <F label="Phone" value={settings.phone} onChange={(v) => setSettings({ ...settings, phone: v })} />
                <F label="Email" value={settings.email} onChange={(v) => setSettings({ ...settings, email: v })} /></div>
              <F label="Address" value={settings.address} onChange={(v) => setSettings({ ...settings, address: v })} />
              <div style={grid2}>
                <F label="Currency" value={settings.currency} onChange={(v) => setSettings({ ...settings, currency: v })} />
                <F label="Default GST %" type="number" value={String(settings.tax_rate)}
                  onChange={(v) => setSettings({ ...settings, tax_rate: Number(v) })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button style={btn()} onClick={() => setShowSettings(false)}>Cancel</button>
              <button style={btn("#ff6a2b", "#0c0d0f")} onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function editItem(id: string, key: string, val: string) {
    updateActive((j) => ({ ...j, line_items: j.line_items.map((li) =>
      li.id === id ? { ...li, [key]: key === "qty" || key === "price" ? Number(val) : val } : li) }));
  }
}

// ---- atoms ----
const fld = { background: "#16181c", border: "1px solid #2a2e35", borderRadius: 6, color: "#e9ecef",
  padding: "9px 11px", fontSize: 14, width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" };
const lbl = { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1, color: "#7a818b",
  marginBottom: 5, display: "block", fontWeight: 600 };
const hdr = { display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
  borderBottom: "1px solid #1f2228", position: "sticky" as const, top: 0, background: "#0c0d0f", zIndex: 10 };
const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const th = { padding: "6px 8px", borderBottom: "1px solid #2a2e35", fontWeight: 600 };
const td = { padding: "4px 8px", verticalAlign: "top" as const };
const btn = (bg = "#2a2e35", fg = "#e9ecef") => ({ background: bg, color: fg, border: "none", borderRadius: 6,
  padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 });

function F({ label, value, onChange, ...rest }:
  { label: string; value: string; onChange: (v: string) => void }
  & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (<div><label style={lbl}>{label}</label>
    <input style={fld} value={value} onChange={(e) => onChange(e.target.value)} {...rest} /></div>);
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="noprint" style={{ marginBottom: 22 }}>
    <div className="disp" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "#ff6a2b",
      marginBottom: 12, fontWeight: 700 }}>{title}</div>{children}</div>);
}
function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "#7a818b" }}>{children}</div>;
}
