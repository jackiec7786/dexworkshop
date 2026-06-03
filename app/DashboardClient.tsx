"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Job, Settings, SERVICE_TYPES, MARK_COLORS, DEX_CODES, CODE_KEYS, pkr, calc, CarDiagram, PrintDoc,
} from "@/components/shared";
import { Spinner, tokens, useToast, useConfirm } from "@/components/ui";

const DEFAULT_SETTINGS: Settings = {
  biz_name: "DEX", tagline: "TINT | WRAP | PDR | PPF | CUSTOMS", phone: "+92-321-443-2687",
  email: "", address: "68C 22nd Commercial St, D.H.A Phase II Extension, Karachi", currency: "Rs", tax_rate: 0,
};

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [tab, setTab] = useState<"inspection" | "quote">("inspection");
  const [view, setView] = useState("top");
  const [activeType, setActiveType] = useState("DD");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Detect mobile viewport after hydration (avoids SSR mismatch).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

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
      if (rStatus.ok) { const st = await rStatus.json(); setUserEmail(st.email ?? ""); }
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const active = jobs.find((j) => j.id === activeId) || null;
  const money = pkr;
  const cur = settings.currency || "Rs";

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

  const selectJob = (id: string) => { setActiveId(id); setTab("inspection"); setView("top"); };

  const newJob = async () => {
    const res = await fetch("/api/jobs", { method: "POST" });
    if (res.status === 401) return onAuthError();
    if (!res.ok) return toast("Couldn't create job.", "error");
    const j: Job = await res.json();
    setJobs((p) => [j, ...p]); selectJob(j.id);
  };

  const deleteJob = async (id: string) => {
    const ok = await confirm({
      title: "Delete this job?",
      message: "This permanently removes the inspection, quote and invoice.",
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

  const editItem = (id: string, key: string, val: string) =>
    updateActive((j) => ({ ...j, line_items: j.line_items.map((li) =>
      li.id === id ? { ...li, [key]: key === "qty" || key === "price" ? Number(val) : val } : li) }));

  const removeItem = (id: string) =>
    updateActive((j) => ({ ...j, line_items: j.line_items.filter((li) => li.id !== id) }));

  const addItem = () =>
    updateActive((j) => ({ ...j,
      line_items: [...j.line_items, { id: "li" + Date.now(), desc: "", type: "PDR", qty: 1, price: 0 }] }));

  if (loading) return <Center><Spinner label="Loading workshop…" /></Center>;
  if (loadError) {
    return (
      <Center>
        <div style={{ textAlign: "center", display: "grid", gap: 14 }}>
          <div className="disp" style={{ fontSize: 22, color: tokens.danger }}>COULDN&apos;T LOAD WORKSHOP</div>
          <p style={{ color: tokens.muted, maxWidth: 320, lineHeight: 1.6 }}>
            Check your connection and try again.
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

  const statusColor: Record<string, string> = { Quote: tokens.info, Invoice: tokens.warn, Paid: tokens.success };

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ─── Header ─── */}
      <header className="noprint" style={hdrStyle}>
        {/* Back arrow: mobile only, when a job is open */}
        {isMobile && activeId && (
          <button style={{ ...btn(), padding: "8px 12px", fontSize: 20, lineHeight: 1, minHeight: 40 }}
            onClick={() => setActiveId(null)} aria-label="Back to jobs list">←</button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dex-logo.png" alt="DEX" style={{ height: 30, objectFit: "contain", flexShrink: 0 }} />

        {/* Mobile breadcrumb: active job customer name */}
        {isMobile && active && (
          <span style={{ fontSize: 12, color: tokens.muted, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginLeft: 8 }}>
            {active.customer.name
              || [active.vehicle.year, active.vehicle.make].filter(Boolean).join(" ")
              || "Unnamed"}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Desktop-only account + nav controls */}
        {!isMobile && <>
          {userEmail && <span style={{ fontSize: 12, color: tokens.faint }}>{userEmail}</span>}
          <button style={btn()} onClick={() => setShowSettings(true)}>⚙ Settings</button>
          <button style={btn()} onClick={signOut}>Sign out</button>
        </>}

        <button
          style={{ ...btn("#ff6a2b", "#0c0d0f"),
            padding: isMobile ? "8px 16px" : "9px 14px",
            fontSize: isMobile ? 20 : 13, lineHeight: 1 }}
          onClick={newJob} aria-label="New job">
          {isMobile ? "+" : "+ New Job"}
        </button>
      </header>

      {/* ─── App shell: CSS drives panel visibility on mobile via data-panel ─── */}
      <div className="app-shell" data-panel={activeId ? "detail" : "list"}>

        {/* ── Job list sidebar ── */}
        <aside className="sidebar noprint">
          <input placeholder="Search name / plate / model…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...fld, marginBottom: 10 }} />

          <div style={{ fontSize: 11, color: tokens.faint, marginBottom: 8 }}>
            {filtered.length} job{filtered.length !== 1 ? "s" : ""}
          </div>

          {jobs.length === 0 && (
            <div style={{ fontSize: 13, color: tokens.faint, lineHeight: 1.7, padding: "12px 4px" }}>
              No jobs yet. Tap <b style={{ color: tokens.accent }}>+</b> to start your first inspection.
            </div>
          )}

          {filtered.map((j) => {
            const sel = j.id === activeId;
            const sc = statusColor[j.status] || tokens.muted;
            const totals = calc(j);
            return (
              <div key={j.id} onClick={() => selectJob(j.id)}
                style={{ padding: "12px 11px", borderRadius: 8, marginBottom: 8, cursor: "pointer",
                  background: sel ? "#1c1f25" : tokens.surface,
                  border: `1px solid ${sel ? tokens.accent : tokens.border}`,
                  WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {j.customer.name || "Unnamed"}
                  </span>
                  <span style={{ fontSize: 10, color: sc, border: `1px solid ${sc}`,
                    borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
                    {j.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: tokens.muted, marginTop: 4 }}>
                  {[j.vehicle.year, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ") || "No vehicle"}
                  {j.vehicle.plate ? ` · ${j.vehicle.plate}` : ""}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                  <span style={{ color: tokens.faint }}>
                    {j.line_items.length
                      ? `${j.line_items.length} item${j.line_items.length !== 1 ? "s" : ""}`
                      : "No items"}
                    {j.marks.length ? ` · ${j.marks.length} mark${j.marks.length !== 1 ? "s" : ""}` : ""}
                  </span>
                  <span style={{ color: tokens.accent, fontWeight: 600 }}>{money(totals.total)}</span>
                </div>
              </div>
            );
          })}
        </aside>

        {/* ── Main editor ── */}
        <main className="main-pane">
          {!active ? (
            <div className="noprint" style={{ color: tokens.faint, display: "grid", placeItems: "center",
              height: "100%", minHeight: 300, textAlign: "center" }}>
              <div>
                <div className="disp" style={{ fontSize: 28, color: "#2a2e35" }}>NO JOB SELECTED</div>
                <p style={{ maxWidth: 360, marginTop: 12, lineHeight: 1.6, fontSize: 14 }}>
                  Pick a job from the list or create one. Each job carries one customer and vehicle
                  through inspection, quote and invoice.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop: tab bar + status dropdown + print/delete */}
              {!isMobile && (
                <div className="noprint"
                  style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
                  {(["inspection", "quote"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      style={btn(tab === t ? tokens.accent : "#1c1f25", tab === t ? "#0c0d0f" : tokens.muted)}>
                      {t === "inspection" ? "Inspection" : "Quote / Invoice"}
                    </button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <select value={active.status}
                    onChange={(e) => updateActive((j) => ({ ...j, status: e.target.value as Job["status"] }))}
                    style={{ ...fld, width: "auto" }}>
                    <option>Quote</option><option>Invoice</option><option>Paid</option>
                  </select>
                  <button style={btn()} onClick={() => { setTab("quote"); setTimeout(() => window.print(), 80); }}>
                    🖨 Print
                  </button>
                  <button style={btn("#2a1416", "#ff8080")} onClick={() => deleteJob(active.id)}>Delete</button>
                </div>
              )}

              {/* Mobile: status + delete row */}
              {isMobile && (
                <div className="noprint"
                  style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
                  <select value={active.status}
                    onChange={(e) => updateActive((j) => ({ ...j, status: e.target.value as Job["status"] }))}
                    style={{ ...fld, flex: 1, width: "auto" }}>
                    <option>Quote</option><option>Invoice</option><option>Paid</option>
                  </select>
                  <button style={btn("#2a1416", "#ff8080")} onClick={() => deleteJob(active.id)}>Delete</button>
                </div>
              )}

              {/* ── Inspection tab ── */}
              {tab === "inspection" && (
                <div className="noprint">
                  <Section title="Customer">
                    <div className="cols-3">
                      {(["name", "phone", "email"] as const).map((f) => (
                        <F key={f} label={f} value={active.customer[f] || ""}
                          onChange={(v) => updateActive((j) => ({ ...j, customer: { ...j.customer, [f]: v } }))} />
                      ))}
                    </div>
                  </Section>

                  <Section title="Vehicle">
                    <div className="cols-3">
                      {(["year", "make", "model", "plate", "color", "vin"] as const).map((f) => (
                        <F key={f} label={f === "vin" ? "VIN" : f} value={active.vehicle[f] || ""}
                          onChange={(v) => updateActive((j) => ({ ...j, vehicle: { ...j.vehicle, [f]: v } }))} />
                      ))}
                    </div>
                  </Section>

                  <Section title="Damage / Work Map">
                    {/* Code picker — 8 codes, horizontal scroll on mobile */}
                    <div className="code-strip">
                      {CODE_KEYS.map((code) => (
                        <button key={code} onClick={() => setActiveType(code)} title={DEX_CODES[code]}
                          style={{ ...btn(activeType === code ? MARK_COLORS[code] : "#1c1f25",
                            activeType === code ? "#0c0d0f" : "#c5cad1"),
                            padding: "10px 0", fontSize: 12, display: "flex", flexDirection: "column",
                            gap: 3, alignItems: "center", width: "100%", minHeight: 0 }}>
                          <span style={{ fontWeight: 700 }}>{code}</span>
                        </button>
                      ))}
                    </div>

                    <div style={{ fontSize: 11, color: tokens.faint, marginBottom: 12 }}>
                      Active: <b style={{ color: MARK_COLORS[activeType] }}>{activeType}</b>
                      {" "}— {DEX_CODES[activeType]}
                      {!isMobile && <span style={{ marginLeft: 8 }}>· tap diagram to drop a mark</span>}
                    </div>

                    {/* View selector — horizontal scroll */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto",
                      scrollbarWidth: "none" }}>
                      {["top", "left", "right", "front"].map((v) => (
                        <button key={v} onClick={() => setView(v)}
                          style={{ ...btn(view === v ? "#2a2e35" : "#131519"),
                            whiteSpace: "nowrap", flexShrink: 0, minHeight: 0 }}>
                          {v}
                        </button>
                      ))}
                    </div>

                    <div style={{ maxWidth: isMobile ? "100%" : 520 }}>
                      <CarDiagram view={view} marks={active.marks}
                        onAdd={(p) => updateActive((j) => ({ ...j, marks: [...j.marks,
                          { id: "m" + Date.now(), type: activeType, note: "", ...p }] }))}
                        onRemove={(id) => updateActive((j) => ({
                          ...j, marks: j.marks.filter((m) => m.id !== id) }))} />
                    </div>

                    {active.marks.length > 0 && (
                      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
                        {active.marks.map((m) => (
                          <li key={m.id} style={{ display: "flex", gap: 8, alignItems: "center",
                            padding: "8px 0", borderBottom: `1px solid ${tokens.border}`,
                            flexWrap: "wrap", fontSize: 13 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%",
                              background: MARK_COLORS[m.type], flexShrink: 0 }} />
                            <b>{m.type}</b>
                            <span style={{ color: tokens.muted }}>{DEX_CODES[m.type]}</span>
                            <span style={{ color: tokens.faint, fontSize: 11 }}>· {m.view}</span>
                            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                              <input type="number" placeholder="sq in" value={m.sqin ?? ""}
                                onChange={(e) => updateActive((j) => ({ ...j, marks: j.marks.map((x) =>
                                  x.id === m.id
                                    ? { ...x, sqin: e.target.value ? Number(e.target.value) : undefined }
                                    : x) }))}
                                style={{ ...fld, width: 80, padding: "5px 8px", fontSize: 12, minHeight: 0 }} />
                              <button style={{ ...btn("#2a1416", "#ff8080"), minHeight: 0 }}
                                onClick={() => updateActive((j) => ({
                                  ...j, marks: j.marks.filter((x) => x.id !== m.id) }))}>×</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>

                  <Section title="Photos">
                    {/* Styled file picker — large tap target on mobile */}
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <div style={{ border: `2px dashed ${tokens.borderHi}`, borderRadius: 8,
                        padding: "18px 12px", textAlign: "center", color: tokens.muted, fontSize: 13,
                        lineHeight: 1.6 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                        {isMobile ? "Tap to take a photo or pick from library" : "Click to upload a photo"}
                      </div>
                      <input type="file" accept="image/*" capture="environment"
                        onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                        style={{ display: "none" }} />
                    </label>
                    {active.photos.length > 0 && (
                      <div style={{ display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: 8, marginTop: 12 }}>
                        {active.photos.map((p) => (
                          <div key={p.url} style={{ position: "relative", borderRadius: 8,
                            overflow: "hidden", aspectRatio: "4/3" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            <button
                              onClick={() => updateActive((j) => ({
                                ...j, photos: j.photos.filter((x) => x.url !== p.url) }))}
                              style={{ position: "absolute", top: 4, right: 4,
                                background: "rgba(12,13,15,0.85)", color: "#ff8080",
                                border: "none", borderRadius: 4, cursor: "pointer",
                                padding: "2px 7px", fontSize: 14, lineHeight: 1.4, minHeight: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section title="Inspection Notes">
                    <textarea style={{ ...fld, minHeight: 90, resize: "vertical" }} value={active.notes}
                      onChange={(e) => updateActive((j) => ({ ...j, notes: e.target.value }))}
                      placeholder="Pre-existing damage, customer concerns, overall condition…" />
                  </Section>
                </div>
              )}

              {/* ── Quote / Invoice tab ── */}
              {tab === "quote" && (
                <>
                  <div className="noprint">
                    <Section title="Line Items">
                      {isMobile ? (
                        /* Mobile: one card per line item */
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {active.line_items.map((li) => (
                            <div key={li.id} style={{ border: `1px solid ${tokens.borderHi}`,
                              borderRadius: 8, padding: 12 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr auto",
                                gap: 8, marginBottom: 8 }}>
                                <input style={fld} placeholder="Description" value={li.desc}
                                  onChange={(e) => editItem(li.id, "desc", e.target.value)} />
                                <button style={{ ...btn("#2a1416", "#ff8080"),
                                  alignSelf: "stretch", padding: "0 14px", minHeight: 0 }}
                                  onClick={() => removeItem(li.id)}>×</button>
                              </div>
                              <div style={{ display: "grid",
                                gridTemplateColumns: "1fr 72px 100px", gap: 8 }}>
                                <select style={fld} value={li.type}
                                  onChange={(e) => editItem(li.id, "type", e.target.value)}>
                                  {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                                </select>
                                <input style={{ ...fld, textAlign: "center" }} type="number"
                                  placeholder="Qty" value={li.qty}
                                  onChange={(e) => editItem(li.id, "qty", e.target.value)} />
                                <input style={fld} type="number" placeholder="Price" value={li.price}
                                  onChange={(e) => editItem(li.id, "price", e.target.value)} />
                              </div>
                              <div style={{ textAlign: "right", color: tokens.muted, fontSize: 12, marginTop: 6 }}>
                                = {money((li.qty || 0) * (li.price || 0))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Desktop: table */
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead><tr style={{ color: tokens.faint, textAlign: "left" }}>
                            <th style={th}>Description</th><th style={th}>Type</th>
                            <th style={{ ...th, width: 60 }}>Qty</th>
                            <th style={{ ...th, width: 110 }}>Price</th>
                            <th style={{ ...th, width: 110 }}>Total</th>
                            <th style={{ ...th, width: 40 }}></th>
                          </tr></thead>
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
                                <td style={{ ...td, color: tokens.muted }}>
                                  {money((li.qty || 0) * (li.price || 0))}
                                </td>
                                <td style={td}><button style={btn("#2a1416", "#ff8080")}
                                  onClick={() => removeItem(li.id)}>×</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <button style={{ ...btn(), marginTop: 10 }} onClick={addItem}>+ Add line</button>
                    </Section>

                    <Section title="Adjustments">
                      <div className="cols-3">
                        <F label={`Discount (${cur})`} type="number" value={String(active.discount)}
                          onChange={(v) => updateActive((j) => ({ ...j, discount: Number(v) }))} />
                        <F label="GST %" type="number" value={String(active.tax_rate)}
                          onChange={(v) => updateActive((j) => ({ ...j, tax_rate: Number(v) }))} />
                        <F label={`Deposit Paid (${cur})`} type="number" value={String(active.deposit)}
                          onChange={(v) => updateActive((j) => ({ ...j, deposit: Number(v) }))} />
                      </div>
                    </Section>

                    {/* Mobile: print button inside the quote section */}
                    {isMobile && (
                      <button style={{ ...btn(), width: "100%", padding: 14, marginBottom: 16, fontSize: 14 }}
                        onClick={() => setTimeout(() => window.print(), 80)}>
                        🖨 Print / Save PDF
                      </button>
                    )}
                  </div>

                  <PrintDoc job={active} settings={settings} />
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* ─── Mobile bottom nav (tab switching + settings) ─── */}
      {activeId && (
        <nav className="mob-nav noprint">
          {[
            { label: "Jobs", icon: "←", onClick: () => setActiveId(null), isActive: false },
            { label: "Inspect", icon: "◎", onClick: () => setTab("inspection"), isActive: tab === "inspection" },
            { label: "Quote", icon: "⊟", onClick: () => setTab("quote"), isActive: tab === "quote" },
            { label: "Settings", icon: "⚙", onClick: () => setShowSettings(true), isActive: false },
          ].map(({ label, icon, onClick, isActive }) => (
            <button key={label} onClick={onClick}
              style={{ flex: 1, background: "transparent", border: "none",
                color: isActive ? tokens.accent : tokens.faint,
                cursor: "pointer", padding: "10px 0 8px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                fontFamily: "inherit",
                borderTop: `2px solid ${isActive ? tokens.accent : "transparent"}` }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 10, letterSpacing: 0.5 }}>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ─── Settings modal ─── */}
      {showSettings && (
        <div className="noprint" onClick={() => setShowSettings(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)",
            display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#131519", padding: 24, borderRadius: 12, width: "100%",
              maxWidth: 460, border: "1px solid #2a2e35", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 className="disp" style={{ margin: "0 0 4px", letterSpacing: 1 }}>WORKSHOP SETTINGS</h3>
            {userEmail && (
              <div style={{ fontSize: 12, color: tokens.faint, marginBottom: 16,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userEmail}
                </span>
                <button style={{ ...btn(), padding: "3px 10px", fontSize: 11, flexShrink: 0 }}
                  onClick={signOut}>Sign out</button>
              </div>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              <F label="Business Name" value={settings.biz_name}
                onChange={(v) => setSettings({ ...settings, biz_name: v })} />
              <F label="Tagline" value={settings.tagline}
                onChange={(v) => setSettings({ ...settings, tagline: v })} />
              <div className="cols-2">
                <F label="Phone" value={settings.phone}
                  onChange={(v) => setSettings({ ...settings, phone: v })} />
                <F label="Email" value={settings.email}
                  onChange={(v) => setSettings({ ...settings, email: v })} />
              </div>
              <F label="Address" value={settings.address}
                onChange={(v) => setSettings({ ...settings, address: v })} />
              <div className="cols-2">
                <F label="Currency symbol" value={settings.currency}
                  onChange={(v) => setSettings({ ...settings, currency: v })} />
                <F label="Default GST %" type="number" value={String(settings.tax_rate)}
                  onChange={(v) => setSettings({ ...settings, tax_rate: Number(v) })} />
              </div>
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
}

// ── Style atoms ─────────────────────────────────────────────────────────────
const fld: React.CSSProperties = {
  background: "#16181c", border: "1px solid #2a2e35", borderRadius: 6, color: "#e9ecef",
  padding: "9px 11px", fontSize: 14, width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const lbl: React.CSSProperties = {
  fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#7a818b",
  marginBottom: 5, display: "block", fontWeight: 600,
};
const hdrStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
  borderBottom: "1px solid #1f2228", position: "sticky", top: 0,
  background: "#0c0d0f", zIndex: 10, minHeight: 56,
};
const th: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #2a2e35", fontWeight: 600 };
const td: React.CSSProperties = { padding: "4px 8px", verticalAlign: "top" };
const btn = (bg = "#2a2e35", fg = "#e9ecef"): React.CSSProperties => ({
  background: bg, color: fg, border: "none", borderRadius: 6,
  padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: 0.3,
});

// ── Small reusable components ────────────────────────────────────────────────
function F({ label, value, onChange, ...rest }:
  { label: string; value: string; onChange: (v: string) => void }
  & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input style={fld} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="noprint" style={{ marginBottom: 22 }}>
      <div className="disp" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2,
        color: tokens.accent, marginBottom: 12, fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "#7a818b" }}>
      {children}
    </div>
  );
}
