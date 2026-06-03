"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Job, Settings, Expense, EXPENSE_CATEGORIES,
  SERVICE_TYPES, MARK_COLORS, DEX_CODES, CODE_KEYS, pkr, calc, CarDiagram, PrintDoc,
} from "@/components/shared";
import { Spinner, tokens, useToast, useConfirm } from "@/components/ui";

const DEFAULT_SETTINGS: Settings = {
  biz_name: "DEX", tagline: "TINT | WRAP | PDR | PPF | CUSTOMS", phone: "+92-321-443-2687",
  email: "", address: "68C 22nd Commercial St, D.H.A Phase II Extension, Karachi", currency: "Rs", tax_rate: 0,
};

type ExpForm = {
  id?: string; date: string; category: string;
  supplier: string; amount: string; gst: string; note: string;
};

const blankExp = (): ExpForm => ({
  date: new Date().toISOString().slice(0, 10),
  category: "Materials", supplier: "", amount: "", gst: "0", note: "",
});

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  // ─── Jobs state ──────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [tab, setTab] = useState<"inspection" | "quote">("inspection");
  const [activeType, setActiveType] = useState("DD");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Accounting state ─────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAccounting, setShowAccounting] = useState(false);
  const now0 = useRef(new Date());
  const [period, setPeriod] = useState(
    `${now0.current.getFullYear()}-${String(now0.current.getMonth() + 1).padStart(2, "0")}`
  );
  const [expForm, setExpForm] = useState<ExpForm | null>(null);
  const [expSaving, setExpSaving] = useState(false);

  // ─── Mobile detection ────────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const onAuthError = useCallback(() => { router.replace("/login"); }, [router]);

  // ─── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const [rJobs, rSettings, rStatus, rExp] = await Promise.all([
        fetch("/api/jobs"), fetch("/api/settings"),
        fetch("/api/auth/status"), fetch("/api/expenses"),
      ]);
      if (rJobs.status === 401) { onAuthError(); return; }
      if (!rJobs.ok) { setLoadError(true); return; }
      setJobs(await rJobs.json());
      if (rSettings.ok) { const s = await rSettings.json(); if (s) setSettings(s); }
      if (rStatus.ok) { const st = await rStatus.json(); setUserEmail(st.email ?? ""); }
      if (rExp.ok) setExpenses(await rExp.json());
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const active = jobs.find((j) => j.id === activeId) || null;
  const money = pkr;
  const cur = settings.currency || "Rs";

  // ─── Job CRUD ────────────────────────────────────────────────────────────
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

  const selectJob = (id: string) => {
    setActiveId(id); setTab("inspection"); setShowAccounting(false);
  };

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

  // ─── Settings ────────────────────────────────────────────────────────────
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

  // ─── Photos ──────────────────────────────────────────────────────────────
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

  // ─── Line items ──────────────────────────────────────────────────────────
  const editItem = (id: string, key: string, val: string) =>
    updateActive((j) => ({ ...j, line_items: j.line_items.map((li) =>
      li.id === id ? { ...li, [key]: key === "qty" || key === "price" ? Number(val) : val } : li) }));

  const removeItem = (id: string) =>
    updateActive((j) => ({ ...j, line_items: j.line_items.filter((li) => li.id !== id) }));

  const addItem = () =>
    updateActive((j) => ({ ...j,
      line_items: [...j.line_items, { id: "li" + Date.now(), desc: "", type: "PDR", qty: 1, price: 0 }] }));

  // ─── Expense CRUD ─────────────────────────────────────────────────────────
  const saveExpense = async () => {
    if (!expForm) return;
    setExpSaving(true);
    try {
      const body = {
        date: expForm.date, category: expForm.category, supplier: expForm.supplier,
        amount: Number(expForm.amount) || 0,
        gst: Number(expForm.gst) || 0,
        note: expForm.note,
      };
      if (expForm.id) {
        const res = await fetch(`/api/expenses/${expForm.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return toast("Couldn't update expense.", "error");
        const updated: Expense = await res.json();
        setExpenses((p) => p.map((e) => e.id === expForm.id ? updated : e));
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return toast("Couldn't save expense.", "error");
        const created: Expense = await res.json();
        setExpenses((p) => [created, ...p]);
      }
      setExpForm(null);
      toast("Expense saved.", "success");
    } finally { setExpSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    const ok = await confirm({ title: "Delete this expense?", confirmText: "Delete", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) return toast("Couldn't delete expense.", "error");
    setExpenses((p) => p.filter((e) => e.id !== id));
    toast("Expense deleted.", "success");
  };

  // ─── Loading / error screens ─────────────────────────────────────────────
  if (loading) return <Center><Spinner label="Loading workshop…" /></Center>;
  if (loadError) {
    return (
      <Center>
        <div style={{ textAlign: "center", display: "grid", gap: 14 }}>
          <div className="disp" style={{ fontSize: 22, color: tokens.danger }}>COULDN&apos;T LOAD WORKSHOP</div>
          <p style={{ color: tokens.muted, maxWidth: 320, lineHeight: 1.6 }}>
            Check your connection and try again.
          </p>
          <button style={btn("#ff6a2b", "#ffffff")} onClick={load}>Retry</button>
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
        {/* Back arrow: mobile only, when a job is open and not in accounting */}
        {isMobile && activeId && !showAccounting && (
          <button style={{ ...btn(), padding: "8px 12px", fontSize: 20, lineHeight: 1, minHeight: 40 }}
            onClick={() => setActiveId(null)} aria-label="Back to jobs list">←</button>
        )}
        {isMobile && showAccounting && (
          <button style={{ ...btn(), padding: "8px 12px", fontSize: 13, minHeight: 40 }}
            onClick={() => setShowAccounting(false)}>← Jobs</button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dex-logo.png" alt="DEX" style={{ height: 30, objectFit: "contain", flexShrink: 0 }} />

        {/* Mobile breadcrumb: active job customer name */}
        {isMobile && active && !showAccounting && (
          <span style={{ fontSize: 12, color: tokens.muted, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginLeft: 8 }}>
            {active.customer.name
              || [active.vehicle.year, active.vehicle.make].filter(Boolean).join(" ")
              || "Unnamed"}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Desktop controls */}
        {!isMobile && <>
          {userEmail && <span style={{ fontSize: 12, color: tokens.faint }}>{userEmail}</span>}
          <button style={btn(showAccounting ? tokens.accent : undefined, showAccounting ? "#fff" : undefined)}
            onClick={() => { setShowAccounting(!showAccounting); setActiveId(null); }}>
            ₨ Accounting
          </button>
          <button style={btn()} onClick={() => setShowSettings(true)}>⚙ Settings</button>
          <button style={btn()} onClick={signOut}>Sign out</button>
        </>}

        {/* Mobile: accounting + settings icons always visible */}
        {isMobile && <>
          <button style={{ ...btn(showAccounting ? tokens.accent : undefined, showAccounting ? "#fff" : undefined),
            padding: "8px 12px", fontSize: 15, minHeight: 40 }}
            onClick={() => { setShowAccounting(!showAccounting); setActiveId(null); }}
            aria-label="Accounting">₨</button>
          <button style={{ ...btn(), padding: "8px 12px", fontSize: 15, minHeight: 40 }}
            onClick={() => setShowSettings(true)} aria-label="Settings">⚙</button>
        </>}

        {!showAccounting && (
          <button
            style={{ ...btn("#ff6a2b", "#ffffff"),
              padding: isMobile ? "8px 16px" : "9px 14px",
              fontSize: isMobile ? 20 : 13, lineHeight: 1 }}
            onClick={newJob} aria-label="New job">
            {isMobile ? "+" : "+ New Job"}
          </button>
        )}
      </header>

      {/* ─── Accounting section (full width) ─── */}
      {showAccounting && (
        <AccountingSection
          isMobile={isMobile} jobs={jobs} expenses={expenses} settings={settings}
          period={period} setPeriod={setPeriod}
          expForm={expForm} setExpForm={setExpForm}
          expSaving={expSaving} onSave={saveExpense} onDelete={deleteExpense}
        />
      )}

      {/* ─── App shell: only when not in accounting ─── */}
      {!showAccounting && (
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
                    background: sel ? "#fff8f5" : tokens.surface,
                    border: `1px solid ${sel ? tokens.accent : tokens.border}`,
                    boxShadow: sel ? `0 0 0 1px ${tokens.accent}20` : "0 1px 3px rgba(0,0,0,0.04)",
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
                  <div className="disp" style={{ fontSize: 28, color: "#d1d5db" }}>NO JOB SELECTED</div>
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
                        style={btn(tab === t ? tokens.accent : "#f3f4f6", tab === t ? "#ffffff" : "#6b7280")}>
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
                    <button style={btn("#fef2f2", "#dc2626")} onClick={() => deleteJob(active.id)}>Delete</button>
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
                    <button style={btn("#fef2f2", "#dc2626")} onClick={() => deleteJob(active.id)}>Delete</button>
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
                      <div className="code-strip">
                        {CODE_KEYS.map((code) => (
                          <button key={code} onClick={() => setActiveType(code)} title={DEX_CODES[code]}
                            style={{ ...btn(activeType === code ? MARK_COLORS[code] : "#f3f4f6",
                              activeType === code ? "#ffffff" : "#374151"),
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

                      <div style={{ maxWidth: isMobile ? "100%" : 620 }}>
                        <CarDiagram view="diagram" marks={active.marks}
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
                              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                                <input type="number" placeholder="sq in" value={m.sqin ?? ""}
                                  onChange={(e) => updateActive((j) => ({ ...j, marks: j.marks.map((x) =>
                                    x.id === m.id
                                      ? { ...x, sqin: e.target.value ? Number(e.target.value) : undefined }
                                      : x) }))}
                                  style={{ ...fld, width: 80, padding: "5px 8px", fontSize: 12, minHeight: 0 }} />
                                <button style={{ ...btn("#fef2f2", "#dc2626"), minHeight: 0 }}
                                  onClick={() => updateActive((j) => ({
                                    ...j, marks: j.marks.filter((x) => x.id !== m.id) }))}>×</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Section>

                    <Section title="Photos">
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
                                  background: "rgba(0,0,0,0.55)", color: "#ffffff",
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
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {active.line_items.map((li) => (
                              <div key={li.id} style={{ border: `1px solid ${tokens.borderHi}`,
                                borderRadius: 8, padding: 12 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto",
                                  gap: 8, marginBottom: 8 }}>
                                  <input style={fld} placeholder="Description" value={li.desc}
                                    onChange={(e) => editItem(li.id, "desc", e.target.value)} />
                                  <button style={{ ...btn("#fef2f2", "#dc2626"),
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
                                  <td style={td}><button style={btn("#fef2f2", "#dc2626")}
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
      )}

      {/* ─── Mobile bottom nav (job detail only, not in accounting) ─── */}
      {activeId && !showAccounting && (
        <nav className="mob-nav noprint">
          {[
            { label: "Jobs", icon: "←", onClick: () => setActiveId(null), isActive: false },
            { label: "Inspect", icon: "◎", onClick: () => setTab("inspection"), isActive: tab === "inspection" },
            { label: "Quote", icon: "⊟", onClick: () => setTab("quote"), isActive: tab === "quote" },
            { label: "Print", icon: "🖨", onClick: () => { setTab("quote"); setTimeout(() => window.print(), 80); }, isActive: false },
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
            style={{ background: "#ffffff", padding: 24, borderRadius: 12, width: "100%",
              maxWidth: 460, border: "1px solid #e5e7eb", maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
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
              <button style={btn("#ff6a2b", "#ffffff")} onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style atoms ──────────────────────────────────────────────────────────────
const fld: React.CSSProperties = {
  background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 6, color: "#111827",
  padding: "9px 11px", fontSize: 14, width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const lbl: React.CSSProperties = {
  fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280",
  marginBottom: 5, display: "block", fontWeight: 600,
};
const hdrStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
  borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0,
  background: "#ffffff", zIndex: 10, minHeight: 56,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const th: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #e5e7eb", fontWeight: 600 };
const td: React.CSSProperties = { padding: "4px 8px", verticalAlign: "top" };
const btn = (bg = "#f3f4f6", fg = "#374151"): React.CSSProperties => ({
  background: bg, color: fg, border: "none", borderRadius: 6,
  padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: 0.3,
});

// ── Category colours ─────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  Rent: tokens.info, Utilities: tokens.warn, Materials: "#7c3aed",
  Labour: tokens.success, Fuel: tokens.danger, Equipment: "#0891b2",
  Maintenance: tokens.muted, Other: tokens.faint,
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

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
    <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "#9ca3af" }}>
      {children}
    </div>
  );
}

// ── Accounting section ───────────────────────────────────────────────────────
function AccountingSection({
  isMobile, jobs, expenses, settings, period, setPeriod,
  expForm, setExpForm, expSaving, onSave, onDelete,
}: {
  isMobile: boolean;
  jobs: Job[];
  expenses: Expense[];
  settings: Settings;
  period: string;
  setPeriod: (p: string) => void;
  expForm: ExpForm | null;
  setExpForm: (f: ExpForm | null) => void;
  expSaving: boolean;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  const [py, pm] = period.split("-").map(Number);
  const money = pkr;

  const prevPeriod = () => {
    if (pm === 1) setPeriod(`${py - 1}-12`);
    else setPeriod(`${py}-${String(pm - 1).padStart(2, "0")}`);
  };
  const nextPeriod = () => {
    if (pm === 12) setPeriod(`${py + 1}-01`);
    else setPeriod(`${py}-${String(pm + 1).padStart(2, "0")}`);
  };

  // Period filtering
  const periodJobs = jobs.filter((j) => {
    const d = new Date(j.created_at);
    return d.getFullYear() === py && (d.getMonth() + 1) === pm;
  });
  const paidJobs = periodJobs.filter((j) => j.status === "Paid");
  const revenue = paidJobs.reduce((s, j) => s + calc(j).total, 0);
  const gstCollected = paidJobs.reduce((s, j) => s + calc(j).taxed, 0);

  const periodExpenses = expenses.filter((e) => {
    const [ey, em] = e.date.split("-").map(Number);
    return ey === py && em === pm;
  });
  const totalExp = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const gstPaid = periodExpenses.reduce((s, e) => s + Number(e.gst), 0);
  const netProfit = revenue - totalExp;
  const gstPayable = gstCollected - gstPaid;

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const e of periodExpenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  }
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const cur = settings.currency || "Rs";

  const card = (label: string, value: number, color: string) => (
    <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
      borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: tokens.faint, letterSpacing: 1.2,
        textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "inherit" }}>
        {value < 0 ? `(${money(-value)})` : money(value)}
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "16px 12px 80px" : "24px 24px 48px",
      maxWidth: 1040, margin: "0 auto" }}>

      {/* Period navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="disp" style={{ fontSize: 20, letterSpacing: 1.5 }}>ACCOUNTING</div>
        <div style={{ flex: 1 }} />
        <button style={{ ...btn(), padding: "7px 13px" }} onClick={prevPeriod}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 130, textAlign: "center" }}>
          {MONTHS[pm - 1]} {py}
        </span>
        <button style={{ ...btn(), padding: "7px 13px" }} onClick={nextPeriod}>›</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {card("Revenue", revenue, tokens.success)}
        {card("Expenses", totalExp, tokens.danger)}
        {card("Net Profit", netProfit, netProfit >= 0 ? tokens.success : tokens.danger)}
        {card("GST Payable", gstPayable, gstPayable >= 0 ? tokens.warn : tokens.success)}
      </div>

      {/* Two-column layout on desktop */}
      <div style={{ display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Expenses column ── */}
        <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
          borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${tokens.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.accent }}>
              EXPENSES
            </span>
            <button style={{ ...btn(expForm && !expForm.id ? "#fef2f2" : "#ff6a2b",
              expForm && !expForm.id ? tokens.danger : "#ffffff"), padding: "6px 12px", fontSize: 12 }}
              onClick={() => setExpForm(expForm && !expForm.id ? null : blankExp())}>
              {expForm && !expForm.id ? "✕ Cancel" : "+ Add Expense"}
            </button>
          </div>

          {/* Inline add/edit form */}
          {expForm && (
            <div style={{ padding: 14, borderBottom: `1px solid ${tokens.border}`,
              background: tokens.surfaceAlt }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
                gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" style={fld} value={expForm.date}
                    onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>Category</label>
                  <select style={fld} value={expForm.category}
                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={isMobile ? { gridColumn: "1 / -1" } : {}}>
                  <label style={lbl}>Supplier / Paid To</label>
                  <input style={fld} value={expForm.supplier} placeholder="e.g. PTCL, Total"
                    onChange={(e) => setExpForm({ ...expForm, supplier: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={lbl}>Amount ({cur})</label>
                  <input type="number" style={fld} value={expForm.amount} placeholder="0"
                    onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>GST incl. ({cur})</label>
                  <input type="number" style={fld} value={expForm.gst} placeholder="0"
                    onChange={(e) => setExpForm({ ...expForm, gst: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>Note</label>
                  <input style={fld} value={expForm.note} placeholder="Optional note"
                    onChange={(e) => setExpForm({ ...expForm, note: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btn()} onClick={() => setExpForm(null)}>Cancel</button>
                <button style={{ ...btn("#ff6a2b", "#ffffff"), opacity: expSaving ? 0.7 : 1 }}
                  disabled={expSaving} onClick={onSave}>
                  {expSaving ? "Saving…" : expForm.id ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </div>
          )}

          {/* Expense rows */}
          {periodExpenses.length === 0 && !expForm ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: tokens.faint, fontSize: 13 }}>
              No expenses logged for {MONTHS[pm - 1]} {py}.
            </div>
          ) : (
            periodExpenses.map((e) => (
              <div key={e.id} style={{ padding: "11px 16px", borderBottom: `1px solid ${tokens.border}`,
                display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: tokens.faint }}>{e.date}</span>
                    <span style={{ fontSize: 10, color: CAT_COLOR[e.category] || tokens.muted,
                      border: `1px solid ${CAT_COLOR[e.category] || tokens.muted}`,
                      borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                      {e.category}
                    </span>
                    {e.supplier && (
                      <span style={{ fontSize: 12, color: tokens.text, fontWeight: 600 }}>{e.supplier}</span>
                    )}
                  </div>
                  {e.note && <div style={{ fontSize: 11, color: tokens.faint, marginTop: 2 }}>{e.note}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: tokens.danger, fontSize: 14 }}>
                    {money(Number(e.amount))}
                  </div>
                  {Number(e.gst) > 0 && (
                    <div style={{ fontSize: 11, color: tokens.faint }}>
                      GST {money(Number(e.gst))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                  <button style={{ ...btn(), padding: "4px 9px", fontSize: 11, minHeight: 0 }}
                    onClick={() => setExpForm({
                      id: e.id, date: e.date, category: e.category, supplier: e.supplier,
                      amount: String(e.amount), gst: String(e.gst), note: e.note,
                    })}>Edit</button>
                  <button style={{ ...btn("#fef2f2", tokens.danger), padding: "4px 9px", fontSize: 11, minHeight: 0 }}
                    onClick={() => onDelete(e.id)}>Del</button>
                </div>
              </div>
            ))
          )}

          {/* Category totals footer */}
          {catEntries.length > 0 && (
            <div style={{ padding: "12px 16px", background: tokens.surfaceAlt,
              borderTop: `1px solid ${tokens.border}` }}>
              <div style={{ fontSize: 10, color: tokens.faint, letterSpacing: 1.2,
                textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>By Category</div>
              {catEntries.map(([cat, amt]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 12, padding: "3px 0", color: tokens.muted }}>
                  <span style={{ color: CAT_COLOR[cat] || tokens.muted, fontWeight: 600 }}>{cat}</span>
                  <span>{money(amt)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0 0",
                fontWeight: 700, fontSize: 13, borderTop: `1px solid ${tokens.borderHi}`, marginTop: 4 }}>
                <span>Total</span>
                <span style={{ color: tokens.danger }}>{money(totalExp)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Revenue + P&L column ── */}
        <div style={{ display: "grid", gap: 16 }}>

          {/* Paid jobs */}
          <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
            borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "13px 16px", borderBottom: `1px solid ${tokens.border}` }}>
              <span className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.accent }}>
                REVENUE — {paidJobs.length} PAID JOB{paidJobs.length !== 1 ? "S" : ""}
              </span>
            </div>
            {paidJobs.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: tokens.faint, fontSize: 13 }}>
                No paid jobs in {MONTHS[pm - 1]} {py}.
              </div>
            ) : (
              paidJobs.map((j) => {
                const c = calc(j);
                return (
                  <div key={j.id} style={{ padding: "11px 16px",
                    borderBottom: `1px solid ${tokens.border}`,
                    display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.customer.name || "Unnamed"}
                      </div>
                      <div style={{ fontSize: 11, color: tokens.muted }}>
                        {[j.vehicle.plate, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: tokens.success }}>{money(c.total)}</div>
                      {c.taxed > 0 && (
                        <div style={{ fontSize: 11, color: tokens.faint }}>GST {money(c.taxed)}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {paidJobs.length > 0 && (
              <div style={{ padding: "10px 16px", background: tokens.surfaceAlt,
                display: "flex", justifyContent: "space-between",
                fontWeight: 700, fontSize: 13, borderTop: `1px solid ${tokens.border}` }}>
                <span>Total</span>
                <span style={{ color: tokens.success }}>{money(revenue)}</span>
              </div>
            )}
          </div>

          {/* P&L summary */}
          <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
            borderRadius: 10, padding: "16px" }}>
            <div className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.accent,
              marginBottom: 12 }}>P&L SUMMARY</div>
            {[
              { label: "Revenue", value: revenue, color: tokens.text },
              { label: "Less: Expenses", value: totalExp, color: tokens.text, neg: true },
              { label: "Net Profit", value: netProfit, color: netProfit >= 0 ? tokens.success : tokens.danger, bold: true },
            ].map(({ label, value, color, neg, bold }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between",
                padding: "6px 0", borderBottom: `1px solid ${tokens.border}`,
                fontWeight: bold ? 700 : 400, fontSize: bold ? 15 : 13 }}>
                <span style={{ color: tokens.muted }}>{label}</span>
                <span style={{ color }}>
                  {neg ? `(${money(value)})` : value < 0 ? `(${money(-value)})` : money(value)}
                </span>
              </div>
            ))}
          </div>

          {/* GST report (only shown if any GST activity) */}
          {(gstCollected > 0 || gstPaid > 0) && (
            <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
              borderRadius: 10, padding: "16px" }}>
              <div className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.accent,
                marginBottom: 12 }}>GST REPORT</div>
              {[
                { label: "GST Collected on invoices", value: gstCollected, color: tokens.success },
                { label: "GST Paid on expenses", value: gstPaid, color: tokens.danger, neg: true },
                { label: "Net GST Payable", value: gstPayable, color: gstPayable >= 0 ? tokens.warn : tokens.success, bold: true },
              ].map(({ label, value, color, neg, bold }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between",
                  padding: "6px 0", borderBottom: `1px solid ${tokens.border}`,
                  fontWeight: bold ? 700 : 400, fontSize: bold ? 14 : 13 }}>
                  <span style={{ color: tokens.muted }}>{label}</span>
                  <span style={{ color }}>
                    {neg ? `(${money(value)})` : value < 0 ? `(${money(-value)})` : money(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
