"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Job, Settings, Expense, EXPENSE_CATEGORIES,
  CustomerRecord, CUSTOMER_TAGS,
  InventoryItem, INVENTORY_CATEGORIES, STOCK_UNITS,
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

  // ─── Shop Management state ────────────────────────────────────────────────
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);

  // ─── CRM state ───────────────────────────────────────────────────────────
  const [showCustomers, setShowCustomers] = useState(false);
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>([]);

  // ─── Inventory state ──────────────────────────────────────────────────────
  const [showInventory, setShowInventory] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

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
      const res = await fetch("/api/bootstrap");
      if (res.status === 401) { onAuthError(); return; }
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      setJobs(data.jobs ?? []);
      if (data.settings) setSettings(data.settings);
      setUserEmail(data.email ?? "");
      setExpenses(data.expenses ?? []);
      setCustomerRecords(data.customers ?? []);
      setInventory(data.inventory ?? []);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const active = jobs.find((j) => j.id === activeId) || null;
  const anySection = showCalendar || showPipeline || showCustomers || showInventory || showAccounting;
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
      else if (!res.ok) {
        const detail = await res.json().catch(() => null);
        console.error("Save failed:", res.status, detail);
        toast("Couldn't save changes.", "error");
      }
    }, 600);
  }, [onAuthError, toast]);

  const updateActive = (mut: (j: Job) => Job) => {
    setJobs((prev) => prev.map((j) => {
      if (j.id !== activeId) return j;
      const next = mut(j); saveJob(next); return next;
    }));
  };

  const selectJob = (id: string) => {
    setActiveId(id); setTab("inspection");
    setShowAccounting(false); setShowCalendar(false); setShowPipeline(false);
    setShowCustomers(false); setShowInventory(false);
  };

  const newJobForCustomer = async (name: string, phone: string, email: string) => {
    const res = await fetch("/api/jobs", { method: "POST" });
    if (res.status === 401) return onAuthError();
    if (!res.ok) return toast("Couldn't create job.", "error");
    const j: Job = await res.json();
    // Pre-fill customer info on the new job
    const patch = await fetch(`/api/jobs/${j.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer: { name, phone, email } }),
    });
    const filled: Job = patch.ok ? await patch.json() : j;
    setJobs((p) => [filled, ...p]);
    selectJob(filled.id);
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
    clearTimeout(saveTimers.current[id]);
    delete saveTimers.current[id];
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

  // ─── Scheduled date ──────────────────────────────────────────────────────
  const saveScheduledDate = useCallback(async (jobId: string, date: string | null) => {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_date: date }),
    });
  }, []);

  // ─── Print helpers ────────────────────────────────────────────────────────
  const printInspection = useCallback(() => {
    setTab("inspection");
    setTimeout(() => window.print(), 80);
  }, []);

  const printQuote = useCallback(() => {
    setTab("quote");
    setTimeout(() => window.print(), 80);
  }, []);

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
        {/* Back arrow: desktop only, when a job is open */}
        {!isMobile && activeId && (
          <button style={{ ...btn(), padding: "8px 12px", fontSize: 20, lineHeight: 1, minHeight: 40 }}
            onClick={() => setActiveId(null)} aria-label="Back to jobs list">←</button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dex-logo.png" alt="DEX" style={{ height: 30, objectFit: "contain", flexShrink: 0 }} />

        {/* Mobile breadcrumb: active job customer name */}
        {isMobile && active && !anySection && (
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
          {(["Calendar","Pipeline","Customers","Inventory","Finance"] as const).map((label) => {
            const isActive = label === "Calendar" ? showCalendar
              : label === "Pipeline" ? showPipeline
              : label === "Customers" ? showCustomers
              : label === "Inventory" ? showInventory
              : showAccounting;
            const icon = label === "Calendar" ? "📅 " : label === "Pipeline" ? "⋮⋮ "
              : label === "Customers" ? "👥 " : label === "Inventory" ? "📦 " : "₨ ";
            const lowStock = label === "Inventory"
              ? inventory.filter((i) => i.stock <= i.reorder_at && i.reorder_at > 0).length : 0;
            return (
              <button key={label}
                style={btn(isActive ? tokens.accent : undefined, isActive ? "#fff" : undefined)}
                onClick={() => {
                  const next = !isActive;
                  setShowCalendar(label === "Calendar" ? next : false);
                  setShowPipeline(label === "Pipeline" ? next : false);
                  setShowCustomers(label === "Customers" ? next : false);
                  setShowInventory(label === "Inventory" ? next : false);
                  setShowAccounting(label === "Finance" ? next : false);
                  if (next) setActiveId(null);
                }}>
                {icon}{label}{lowStock > 0 && <span style={{ marginLeft: 5, background: tokens.danger,
                  color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{lowStock}</span>}
              </button>
            );
          })}
          <button style={btn()} onClick={() => setShowSettings(true)}>⚙ Settings</button>
          <button style={btn()} onClick={signOut}>Sign out</button>
        </>}

        {/* Mobile: settings icon only (section nav is in bottom tab bar) */}
        {isMobile && (
          <button style={{ ...btn(), padding: "8px 10px", fontSize: 15, minHeight: 40 }}
            onClick={() => setShowSettings(true)} aria-label="Settings">⚙</button>
        )}

        {!anySection && (
          <button
            style={{ ...btn("#ff6a2b", "#ffffff"),
              padding: isMobile ? "8px 16px" : "9px 14px",
              fontSize: isMobile ? 20 : 13, lineHeight: 1 }}
            onClick={newJob} aria-label="New job">
            {isMobile ? "+" : "+ New Job"}
          </button>
        )}
      </header>

      {/* ─── Calendar section ─── */}
      {showCalendar && (
        <CalendarSection isMobile={isMobile} jobs={jobs} onSelectJob={selectJob} />
      )}

      {/* ─── Pipeline section ─── */}
      {showPipeline && (
        <PipelineSection isMobile={isMobile} jobs={jobs} onSelectJob={selectJob} onNewJob={newJob} />
      )}

      {/* ─── Inventory section ─── */}
      {showInventory && (
        <InventorySection isMobile={isMobile} inventory={inventory} setInventory={setInventory} />
      )}

      {/* ─── Customers section ─── */}
      {showCustomers && (
        <CustomersSection
          isMobile={isMobile} jobs={jobs} customerRecords={customerRecords}
          setCustomerRecords={setCustomerRecords}
          onSelectJob={selectJob} onNewJobForCustomer={newJobForCustomer}
        />
      )}

      {/* ─── Accounting section (full width) ─── */}
      {showAccounting && (
        <AccountingSection
          isMobile={isMobile} jobs={jobs} expenses={expenses} settings={settings}
          period={period} setPeriod={setPeriod}
          expForm={expForm} setExpForm={setExpForm}
          expSaving={expSaving} onSave={saveExpense} onDelete={deleteExpense}
        />
      )}

      {/* ─── App shell: only when not in a full-screen section ─── */}
      {!anySection && (
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
                  {j.scheduled_date && (
                    <div style={{ marginTop: 5, fontSize: 11, color: tokens.info,
                      display: "flex", alignItems: "center", gap: 3 }}>
                      <span>📅</span>
                      <span>{new Date(j.scheduled_date + "T00:00:00").toLocaleDateString("en-GB",
                        { day: "numeric", month: "short" })}</span>
                    </div>
                  )}
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
                    <button style={btn()} onClick={printInspection}>🖨 Inspection</button>
                    <button style={btn()} onClick={printQuote}>
                      🖨 {active.status === "Quote" ? "Quote" : active.status === "Paid" ? "Receipt" : "Invoice"}
                    </button>
                    <button style={btn("#fef2f2", "#dc2626")} onClick={() => deleteJob(active.id)}>Delete</button>
                  </div>
                )}

                {/* Mobile: status row */}
                {isMobile && (
                  <div className="noprint"
                    style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
                    <select value={active.status}
                      onChange={(e) => updateActive((j) => ({ ...j, status: e.target.value as Job["status"] }))}
                      style={{ ...fld, flex: 1, width: "auto" }}>
                      <option>Quote</option><option>Invoice</option><option>Paid</option>
                    </select>
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

                    <Section title="Booking Date">
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <label style={lbl}>Scheduled Date</label>
                          <input type="date" style={{ ...fld, width: "auto" }}
                            value={active.scheduled_date || ""}
                            onChange={(e) => {
                              const d = e.target.value || null;
                              updateActive((j) => ({ ...j, scheduled_date: d }));
                              saveScheduledDate(active.id, d);
                            }} />
                        </div>
                        {active.scheduled_date && (
                          <div style={{ marginTop: 20, fontSize: 13, color: tokens.muted }}>
                            {new Date(active.scheduled_date + "T00:00:00").toLocaleDateString("en-GB",
                              { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </div>
                        )}
                        {active.scheduled_date && (
                          <button style={{ marginTop: 20, ...btn("#fef2f2", tokens.danger),
                            padding: "5px 10px", fontSize: 12, minHeight: 0 }}
                            onClick={() => {
                              updateActive((j) => ({ ...j, scheduled_date: null }));
                              saveScheduledDate(active.id, null);
                            }}>
                            Clear
                          </button>
                        )}
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

                    {isMobile && (
                      <button style={{ ...btn(), width: "100%", padding: 14, marginBottom: 16, fontSize: 14 }}
                        onClick={printInspection}>
                        🖨 Print Inspection Sheet
                      </button>
                    )}
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
                          onClick={printQuote}>
                          🖨 Print {active.status === "Quote" ? "Quote" : active.status === "Paid" ? "Receipt" : "Invoice"}
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Delete — bottom of form, away from accidental taps */}
                {isMobile && (
                  <div className="noprint" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
                    <button style={{ ...btn("#fef2f2", "#dc2626"), width: "100%", padding: 12 }}
                      onClick={() => deleteJob(active.id)}>
                      Delete Job
                    </button>
                  </div>
                )}

                {/* Quote preview — visible on screen only when on the quote tab */}
                {tab === "quote" && (
                  <PrintDoc job={active} settings={settings} mode="quote" />
                )}

                {/* Inspection sheet — always in DOM for printing, hidden from screen */}
                {tab !== "quote" && (
                  <div style={{ height: 0, overflow: "hidden" }}>
                    <PrintDoc job={active} settings={settings} mode="inspection" />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {/* ─── Mobile bottom nav: always visible, content changes by context ─── */}
      <nav className="mob-nav noprint">
        {activeId && !anySection ? (
          // Job detail mode: job-level navigation
          [
            { label: "Jobs", icon: "←", onClick: () => setActiveId(null), isActive: false },
            { label: "Inspect", icon: "◎", onClick: () => setTab("inspection"), isActive: tab === "inspection" },
            { label: "Quote", icon: "⊟", onClick: () => setTab("quote"), isActive: tab === "quote" },
            { label: "Print", icon: "🖨", onClick: () => tab === "inspection" ? printInspection() : printQuote(), isActive: false },
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
          ))
        ) : (
          // Section navigation mode
          ([
            { label: "Jobs",  icon: "🏠", isActive: !activeId && !anySection,
              onClick: () => { setActiveId(null); setShowCalendar(false); setShowPipeline(false); setShowCustomers(false); setShowInventory(false); setShowAccounting(false); } },
            { label: "Book",  icon: "📅", isActive: showCalendar,
              onClick: () => { const n = !showCalendar; setShowCalendar(n); setShowPipeline(false); setShowCustomers(false); setShowInventory(false); setShowAccounting(false); if (n) setActiveId(null); } },
            { label: "CRM",   icon: "👥", isActive: showCustomers,
              onClick: () => { const n = !showCustomers; setShowCustomers(n); setShowCalendar(false); setShowPipeline(false); setShowInventory(false); setShowAccounting(false); if (n) setActiveId(null); } },
            { label: "Stock", icon: "📦", isActive: showInventory,
              onClick: () => { const n = !showInventory; setShowInventory(n); setShowCalendar(false); setShowPipeline(false); setShowCustomers(false); setShowAccounting(false); if (n) setActiveId(null); },
              badge: inventory.filter((i) => i.stock <= i.reorder_at && i.reorder_at > 0).length },
            { label: "Finance", icon: "₨", isActive: showAccounting,
              onClick: () => { const n = !showAccounting; setShowAccounting(n); setShowCalendar(false); setShowPipeline(false); setShowCustomers(false); setShowInventory(false); if (n) setActiveId(null); } },
          ] as { label: string; icon: string; isActive: boolean; onClick: () => void; badge?: number }[]).map(
            ({ label, icon, isActive, onClick, badge }) => (
              <button key={label} onClick={onClick}
                style={{ flex: 1, background: "transparent", border: "none",
                  color: isActive ? tokens.accent : tokens.faint,
                  cursor: "pointer", padding: "10px 0 8px", position: "relative",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  fontFamily: "inherit",
                  borderTop: `2px solid ${isActive ? tokens.accent : "transparent"}` }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: 10, letterSpacing: 0.5 }}>{label}</span>
                {!!badge && (
                  <span style={{ position: "absolute", top: 6, right: "50%", transform: "translateX(10px)",
                    width: 14, height: 14, background: tokens.danger, color: "#fff",
                    borderRadius: "50%", fontSize: 9, display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700 }}>{badge}</span>
                )}
              </button>
            )
          )
        )}
      </nav>

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
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 2fr", gap: 8, marginBottom: 10 }}>
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
                <div style={isMobile ? { gridColumn: "1 / -1" } : {}}>
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

// ── Pipeline section ─────────────────────────────────────────────────────────
const PIPELINE_STATUSES = ["Quote", "Invoice", "Paid"] as const;
const PIPE_STATUS_COLOR: Record<string, string> = {
  Quote: tokens.info, Invoice: tokens.warn, Paid: tokens.success,
};

function PipelineSection({ isMobile, jobs, onSelectJob, onNewJob }: {
  isMobile: boolean;
  jobs: Job[];
  onSelectJob: (id: string) => void;
  onNewJob: () => void;
}) {
  return (
    <div style={{ padding: isMobile ? "16px 12px 80px" : "24px 24px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="disp" style={{ fontSize: 20, letterSpacing: 1.5 }}>PIPELINE</div>
        <div style={{ flex: 1 }} />
        <button style={{ ...btn("#ff6a2b", "#ffffff"), padding: "8px 14px" }} onClick={onNewJob}>
          + New Job
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 16,
        alignItems: "start",
        overflowX: isMobile ? "visible" : "auto",
      }}>
        {PIPELINE_STATUSES.map((status) => {
          const col = jobs.filter((j) => j.status === status);
          const sc = PIPE_STATUS_COLOR[status];
          const total = col.reduce((s, j) => s + calc(j).total, 0);
          return (
            <div key={status} style={{ background: tokens.surface,
              border: `1px solid ${tokens.border}`, borderRadius: 10, overflow: "hidden" }}>
              {/* Column header */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${tokens.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderTop: `3px solid ${sc}` }}>
                <span className="disp" style={{ fontSize: 12, letterSpacing: 1.5, color: sc }}>
                  {status.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: tokens.faint }}>
                  {col.length} job{col.length !== 1 ? "s" : ""}
                  {col.length > 0 && ` · ${pkr(total)}`}
                </span>
              </div>

              {col.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center", color: tokens.faint, fontSize: 13 }}>
                  No {status.toLowerCase()} jobs
                </div>
              ) : (
                col.map((j) => {
                  const c = calc(j);
                  return (
                    <div key={j.id} onClick={() => onSelectJob(j.id)}
                      style={{ padding: "12px 16px", borderBottom: `1px solid ${tokens.border}`,
                        cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.customer.name || "Unnamed"}
                      </div>
                      <div style={{ fontSize: 11, color: tokens.muted, marginBottom: 6 }}>
                        {[j.vehicle.year, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ") || "No vehicle"}
                        {j.vehicle.plate ? ` · ${j.vehicle.plate}` : ""}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", fontSize: 12 }}>
                        <span style={{ color: tokens.faint }}>
                          {j.line_items.length ? `${j.line_items.length} item${j.line_items.length !== 1 ? "s" : ""}` : "No items"}
                        </span>
                        <span style={{ fontWeight: 700, color: tokens.accent }}>{pkr(c.total)}</span>
                      </div>
                      {j.scheduled_date && (
                        <div style={{ marginTop: 5, fontSize: 11, color: tokens.info,
                          display: "flex", alignItems: "center", gap: 4 }}>
                          <span>📅</span>
                          <span>{new Date(j.scheduled_date + "T00:00:00").toLocaleDateString("en-GB",
                            { day: "numeric", month: "short" })}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendar section ─────────────────────────────────────────────────────────
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarSection({ isMobile, jobs, onSelectJob }: {
  isMobile: boolean;
  jobs: Job[];
  onSelectJob: (id: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today.toISOString().slice(0, 10);

  // Map scheduled_date → jobs[]
  const byDate: Record<string, Job[]> = {};
  for (const j of jobs) {
    if (j.scheduled_date) {
      byDate[j.scheduled_date] = [...(byDate[j.scheduled_date] || []), j];
    }
  }

  const selectedJobs = selectedDate ? (byDate[selectedDate] || []) : [];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const unscheduled = jobs.filter((j) => !j.scheduled_date);

  return (
    <div style={{ padding: isMobile ? "16px 12px 80px" : "24px 24px 48px",
      maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="disp" style={{ fontSize: 20, letterSpacing: 1.5 }}>CALENDAR</div>
        <div style={{ flex: 1 }} />
        <button style={{ ...btn(), padding: "7px 13px" }} onClick={prevMonth}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 130, textAlign: "center" }}>
          {MONTHS[month]} {year}
        </span>
        <button style={{ ...btn(), padding: "7px 13px" }} onClick={nextMonth}>›</button>
      </div>

      <div style={{ display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 16, alignItems: "start" }}>

        {/* ── Month grid ── */}
        <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
          borderRadius: 10, overflow: "hidden" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: `1px solid ${tokens.border}` }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ padding: "8px 4px", textAlign: "center",
                fontSize: 11, fontWeight: 700, color: tokens.faint, letterSpacing: 0.5 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`e${i}`} style={{ padding: "10px 4px", minHeight: 52 }} />;
              }
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayJobs = byDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <div key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    padding: "8px 4px", minHeight: 52, cursor: "pointer",
                    borderBottom: `1px solid ${tokens.border}`,
                    borderRight: `1px solid ${tokens.border}`,
                    background: isSelected ? "#fff8f5" : isToday ? "#f0f9ff" : "transparent",
                    transition: "background 0.1s",
                  }}>
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: isToday ? 700 : 400,
                    color: isToday ? tokens.accent : tokens.text,
                    width: 24, height: 24, lineHeight: "24px", margin: "0 auto",
                    borderRadius: "50%",
                    border: isSelected ? `2px solid ${tokens.accent}` : isToday ? `2px solid ${tokens.info}` : "none",
                  }}>
                    {day}
                  </div>
                  {/* Job dots */}
                  {dayJobs.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2,
                      justifyContent: "center", marginTop: 4 }}>
                      {dayJobs.slice(0, 4).map((j) => (
                        <span key={j.id} style={{ width: 7, height: 7, borderRadius: "50%",
                          background: PIPE_STATUS_COLOR[j.status] || tokens.muted,
                          flexShrink: 0 }} />
                      ))}
                      {dayJobs.length > 4 && (
                        <span style={{ fontSize: 9, color: tokens.faint, lineHeight: "7px" }}>
                          +{dayJobs.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail panel ── */}
        <div style={{ display: "grid", gap: 12 }}>
          {selectedDate ? (
            <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
              borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${tokens.border}` }}>
                <span className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.accent }}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB",
                    { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
                </span>
              </div>
              {selectedJobs.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: tokens.faint, fontSize: 13 }}>
                  No jobs booked for this day.
                </div>
              ) : (
                selectedJobs.map((j) => {
                  const c = calc(j);
                  const sc = PIPE_STATUS_COLOR[j.status];
                  return (
                    <div key={j.id} onClick={() => onSelectJob(j.id)}
                      style={{ padding: "12px 16px", borderBottom: `1px solid ${tokens.border}`,
                        cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {j.customer.name || "Unnamed"}
                          </div>
                          <div style={{ fontSize: 11, color: tokens.muted, marginTop: 2 }}>
                            {[j.vehicle.year, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ") || "No vehicle"}
                            {j.vehicle.plate ? ` · ${j.vehicle.plate}` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column",
                          alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: sc, border: `1px solid ${sc}`,
                            borderRadius: 4, padding: "2px 7px" }}>{j.status}</span>
                          <span style={{ fontWeight: 700, color: tokens.accent, fontSize: 12 }}>
                            {pkr(c.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
              borderRadius: 10, padding: "24px 16px", textAlign: "center",
              color: tokens.faint, fontSize: 13 }}>
              Tap a day to see booked jobs.
            </div>
          )}

          {/* Unscheduled jobs */}
          {unscheduled.length > 0 && (
            <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
              borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${tokens.border}` }}>
                <span className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.faint }}>
                  UNSCHEDULED — {unscheduled.length}
                </span>
              </div>
              {unscheduled.slice(0, 6).map((j) => (
                <div key={j.id} onClick={() => onSelectJob(j.id)}
                  style={{ padding: "10px 16px", borderBottom: `1px solid ${tokens.border}`,
                    cursor: "pointer", fontSize: 13 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ fontWeight: 600, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {j.customer.name || "Unnamed"}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.muted, marginTop: 2 }}>
                    {j.vehicle.plate || [j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ") || "No vehicle"}
                    {" · "}
                    <span style={{ color: PIPE_STATUS_COLOR[j.status] }}>{j.status}</span>
                  </div>
                </div>
              ))}
              {unscheduled.length > 6 && (
                <div style={{ padding: "10px 16px", fontSize: 12, color: tokens.faint,
                  textAlign: "center" }}>
                  +{unscheduled.length - 6} more — open job to set a booking date
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Customers / CRM section ───────────────────────────────────────────────────

/** Normalize a phone string to digits-only for matching. */
function normPhone(p: string) { return (p || "").replace(/\D/g, ""); }

type DerivedCustomer = {
  key: string;       // normPhone or fallback to lower name
  name: string;
  phone: string;
  email: string;
  jobs: Job[];
  totalRevenue: number;
  lastVisitDate: string;
  vehicles: string[];
  record: CustomerRecord | null;
};

function deriveCustomers(jobs: Job[], records: CustomerRecord[]): DerivedCustomer[] {
  const recByPhone = new Map(records.map((r) => [r.phone, r]));
  const map = new Map<string, DerivedCustomer>();

  for (const j of jobs) {
    const phone = normPhone(j.customer.phone || "");
    const name = (j.customer.name || "").trim();
    const key = phone || name.toLowerCase() || "unknown";

    if (!map.has(key)) {
      map.set(key, {
        key, name, phone,
        email: j.customer.email || "",
        jobs: [], totalRevenue: 0,
        lastVisitDate: j.created_at,
        vehicles: [],
        record: recByPhone.get(phone) ?? null,
      });
    }
    const c = map.get(key)!;
    c.jobs.push(j);
    if (j.status === "Paid") c.totalRevenue += calc(j).total;
    if (j.created_at > c.lastVisitDate) {
      c.lastVisitDate = j.created_at;
      if (j.customer.name) c.name = j.customer.name;
      if (j.customer.phone) c.phone = j.customer.phone;
      if (j.customer.email) c.email = j.customer.email;
    }
    const veh = [j.vehicle.year, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ");
    const plate = j.vehicle.plate;
    if (veh && !c.vehicles.includes(veh)) c.vehicles.push(veh);
    if (plate && !c.vehicles.includes(plate)) c.vehicles.unshift(plate);
  }

  return Array.from(map.values()).sort((a, b) => b.lastVisitDate.localeCompare(a.lastVisitDate));
}

const TAG_COLORS: Record<string, string> = {
  VIP: "#d97706", Regular: tokens.info, Fleet: "#0891b2",
  Wholesale: "#7c3aed", Referred: tokens.success, Blocked: tokens.danger,
};

function CustomersSection({ isMobile, jobs, customerRecords, setCustomerRecords, onSelectJob, onNewJobForCustomer }: {
  isMobile: boolean;
  jobs: Job[];
  customerRecords: CustomerRecord[];
  setCustomerRecords: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
  onSelectJob: (id: string) => void;
  onNewJobForCustomer: (name: string, phone: string, email: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const all = deriveCustomers(jobs, customerRecords);

  const filtered = search.trim()
    ? all.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.vehicles.some((v) => v.toLowerCase().includes(q));
      })
    : all;

  const selected = selectedKey ? all.find((c) => c.key === selectedKey) ?? null : null;

  const openCustomer = (c: DerivedCustomer) => {
    setSelectedKey(c.key);
    setNotesDraft(c.record?.notes ?? "");
    setTagsDraft(c.record?.tags ?? []);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const phone = normPhone(selected.phone);
      if (selected.record) {
        const res = await fetch(`/api/customers/${selected.record.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notesDraft, tags: tagsDraft }),
        });
        if (!res.ok) return;
        const updated: CustomerRecord = await res.json();
        setCustomerRecords((p) => p.map((r) => r.id === updated.id ? updated : r));
      } else {
        const res = await fetch("/api/customers", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, notes: notesDraft, tags: tagsDraft }),
        });
        if (!res.ok) return;
        const created: CustomerRecord = await res.json();
        setCustomerRecords((p) => [...p, created]);
      }
    } finally { setSaving(false); }
  };

  const toggleTag = (tag: string) =>
    setTagsDraft((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const statusColor: Record<string, string> = {
    Quote: tokens.info, Invoice: tokens.warn, Paid: tokens.success,
  };

  // Mobile: show detail panel when a customer is selected
  if (isMobile && selected) {
    return (
      <div style={{ padding: "16px 12px 80px" }}>
        <button style={{ ...btn(), marginBottom: 16 }} onClick={() => setSelectedKey(null)}>← Customers</button>
        <CustomerDetail selected={selected} notesDraft={notesDraft} setNotesDraft={setNotesDraft}
          tagsDraft={tagsDraft} toggleTag={toggleTag} saving={saving} onSave={saveNotes}
          onSelectJob={onSelectJob} onNewJobForCustomer={onNewJobForCustomer}
          statusColor={statusColor} />
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "16px 12px 80px" : "24px 24px 48px",
      maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="disp" style={{ fontSize: 20, letterSpacing: 1.5 }}>CUSTOMERS</div>
        <span style={{ fontSize: 13, color: tokens.faint }}>{all.length} total</span>
        <div style={{ flex: 1 }} />
        <input placeholder="Search name, phone, plate…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...fld, width: isMobile ? "100%" : 260 }} />
      </div>

      <div style={{ display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : selectedKey ? "340px 1fr" : "1fr",
        gap: 16, alignItems: "start" }}>

        {/* ── Customer list ── */}
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: tokens.faint,
              background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 10 }}>
              {search ? "No customers match that search." : "No customers yet — jobs will appear here."}
            </div>
          )}
          {filtered.map((c) => {
            const isSelected = c.key === selectedKey;
            const avgJob = c.jobs.length ? c.totalRevenue / c.jobs.filter((j) => j.status === "Paid").length || 0 : 0;
            return (
              <div key={c.key} onClick={() => openCustomer(c)}
                style={{ background: isSelected ? "#fff8f5" : tokens.surface,
                  border: `1px solid ${isSelected ? tokens.accent : tokens.border}`,
                  borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                  boxShadow: isSelected ? `0 0 0 1px ${tokens.accent}20` : "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name || "Unnamed"}
                    </div>
                    {c.phone && (
                      <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>{c.phone}</div>
                    )}
                    {c.vehicles.length > 0 && (
                      <div style={{ fontSize: 11, color: tokens.faint, marginTop: 3,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.vehicles.slice(0, 3).join(" · ")}
                      </div>
                    )}
                    {/* Tags */}
                    {(c.record?.tags ?? []).length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                        {(c.record!.tags).map((t) => (
                          <span key={t} style={{ fontSize: 10, fontWeight: 700,
                            color: TAG_COLORS[t] || tokens.muted,
                            border: `1px solid ${TAG_COLORS[t] || tokens.muted}`,
                            borderRadius: 4, padding: "1px 6px" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: tokens.accent, fontSize: 14 }}>
                      {pkr(c.totalRevenue)}
                    </div>
                    <div style={{ fontSize: 11, color: tokens.faint, marginTop: 2 }}>
                      {c.jobs.length} job{c.jobs.length !== 1 ? "s" : ""}
                    </div>
                    {avgJob > 0 && (
                      <div style={{ fontSize: 11, color: tokens.muted, marginTop: 1 }}>
                        avg {pkr(avgJob)}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: tokens.faint, marginTop: 4 }}>
                      {new Date(c.lastVisitDate).toLocaleDateString("en-GB",
                        { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Customer detail (desktop) ── */}
        {!isMobile && selected && (
          <CustomerDetail selected={selected} notesDraft={notesDraft} setNotesDraft={setNotesDraft}
            tagsDraft={tagsDraft} toggleTag={toggleTag} saving={saving} onSave={saveNotes}
            onSelectJob={onSelectJob} onNewJobForCustomer={onNewJobForCustomer}
            statusColor={statusColor} />
        )}
      </div>
    </div>
  );
}

function CustomerDetail({ selected, notesDraft, setNotesDraft, tagsDraft, toggleTag,
  saving, onSave, onSelectJob, onNewJobForCustomer, statusColor }: {
  selected: DerivedCustomer;
  notesDraft: string;
  setNotesDraft: (v: string) => void;
  tagsDraft: string[];
  toggleTag: (t: string) => void;
  saving: boolean;
  onSave: () => void;
  onSelectJob: (id: string) => void;
  onNewJobForCustomer: (name: string, phone: string, email: string) => void;
  statusColor: Record<string, string>;
}) {
  const paid = selected.jobs.filter((j) => j.status === "Paid");
  const pending = selected.jobs.filter((j) => j.status !== "Paid");
  const lastJob = selected.jobs.reduce((a, b) =>
    a.created_at > b.created_at ? a : b, selected.jobs[0]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Profile card */}
      <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
        borderRadius: 10, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div className="disp" style={{ fontSize: 18, letterSpacing: 1 }}>
              {selected.name || "Unnamed"}
            </div>
            {selected.phone && (
              <div style={{ fontSize: 13, color: tokens.muted, marginTop: 3 }}>📱 {selected.phone}</div>
            )}
            {selected.email && (
              <div style={{ fontSize: 13, color: tokens.muted, marginTop: 2 }}>✉ {selected.email}</div>
            )}
          </div>
          <button style={{ ...btn("#ff6a2b", "#ffffff"), padding: "8px 16px" }}
            onClick={() => onNewJobForCustomer(selected.name, selected.phone, selected.email)}>
            + New Job
          </button>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
          {[
            { label: "Total Revenue", value: pkr(selected.totalRevenue), color: tokens.success },
            { label: "Jobs", value: String(selected.jobs.length), color: tokens.text },
            { label: "Last Visit", value: lastJob
              ? new Date(lastJob.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : "—", color: tokens.muted },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: tokens.surfaceAlt,
              borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: tokens.faint, letterSpacing: 1,
                textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Vehicles */}
        {selected.vehicles.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: tokens.muted }}>
            <span style={{ fontWeight: 600, color: tokens.faint }}>Vehicles: </span>
            {selected.vehicles.join(" · ")}
          </div>
        )}
      </div>

      {/* Tags */}
      <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
        borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 10, color: tokens.faint, letterSpacing: 1.2,
          textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Tags</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CUSTOMER_TAGS.map((tag) => {
            const on = tagsDraft.includes(tag);
            const col = TAG_COLORS[tag] || tokens.muted;
            return (
              <button key={tag} onClick={() => toggleTag(tag)}
                style={{ ...btn(on ? col : tokens.surfaceAlt, on ? "#fff" : col),
                  padding: "5px 12px", fontSize: 12, fontWeight: 700,
                  border: `1px solid ${col}`, borderRadius: 20 }}>
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
        borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 10, color: tokens.faint, letterSpacing: 1.2,
          textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Notes</div>
        {!selected.phone && (
          <div style={{ fontSize: 12, color: tokens.warn, marginBottom: 8 }}>
            Add a phone number to this customer&apos;s job to enable saving notes.
          </div>
        )}
        <textarea rows={4} style={{ ...fld, resize: "vertical", minHeight: 80 }}
          value={notesDraft} placeholder="Car preferences, special instructions, VIP perks…"
          onChange={(e) => setNotesDraft(e.target.value)} />
        <button style={{ ...btn("#ff6a2b", "#ffffff"), marginTop: 8, opacity: saving ? 0.7 : 1 }}
          disabled={saving || !selected.phone} onClick={onSave}>
          {saving ? "Saving…" : "Save Notes & Tags"}
        </button>
      </div>

      {/* Job history */}
      <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
        borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${tokens.border}` }}>
          <span className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.accent }}>
            JOB HISTORY — {selected.jobs.length}
          </span>
        </div>
        {[...selected.jobs].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((j) => {
          const c = calc(j);
          const sc = statusColor[j.status] || tokens.muted;
          return (
            <div key={j.id} onClick={() => onSelectJob(j.id)}
              style={{ padding: "11px 16px", borderBottom: `1px solid ${tokens.border}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: tokens.muted,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[j.vehicle.year, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ") || "No vehicle"}
                  {j.vehicle.plate ? ` · ${j.vehicle.plate}` : ""}
                </div>
                <div style={{ fontSize: 11, color: tokens.faint, marginTop: 2 }}>
                  {new Date(j.created_at).toLocaleDateString("en-GB",
                    { day: "numeric", month: "short", year: "numeric" })}
                  {j.scheduled_date && ` · Booked ${new Date(j.scheduled_date + "T00:00:00")
                    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: sc, border: `1px solid ${sc}`,
                  borderRadius: 4, padding: "2px 7px", marginBottom: 4 }}>{j.status}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: tokens.accent }}>{pkr(c.total)}</div>
              </div>
            </div>
          );
        })}
        {selected.jobs.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: tokens.faint, fontSize: 13 }}>
            No jobs yet.
          </div>
        )}
        {/* Mini P&L */}
        {paid.length > 0 && (
          <div style={{ padding: "10px 16px", background: tokens.surfaceAlt,
            borderTop: `1px solid ${tokens.border}`, fontSize: 12,
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ color: tokens.faint }}>
              {paid.length} paid · {pending.length} open
            </span>
            <span style={{ fontWeight: 700, color: tokens.success }}>
              {pkr(selected.totalRevenue)} revenue
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inventory section ─────────────────────────────────────────────────────────

type ItemForm = {
  id?: string;
  name: string; category: string; unit: string;
  stock: string; reorder_at: string; cost: string;
  supplier: string; notes: string;
};

const blankItem = (): ItemForm => ({
  name: "", category: "Consumable", unit: "pcs",
  stock: "0", reorder_at: "0", cost: "0", supplier: "", notes: "",
});

const CAT_BADGE: Record<string, string> = {
  Film: "#0891b2", Chemical: "#7c3aed", Consumable: tokens.success,
  Equipment: tokens.warn, Other: tokens.muted,
};

function InventorySection({ isMobile, inventory, setInventory }: {
  isMobile: boolean;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
}) {
  const toast = useToast();
  const confirm = useConfirm();

  const [catFilter, setCatFilter] = useState<string>("All");
  const [itemForm, setItemForm] = useState<ItemForm | null>(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [adjQty, setAdjQty] = useState<Record<string, string>>({});

  // Debounce stock adjustments: accumulate deltas, flush after 400 ms idle
  const adjTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const adjPending = useRef<Record<string, number>>({});

  const lowStock = inventory.filter((i) => i.reorder_at > 0 && i.stock <= i.reorder_at);

  const visible = inventory.filter((i) =>
    catFilter === "All" || i.category === catFilter
  );

  const getAdj = (id: string) => adjQty[id] ?? "1";
  const setAdj = (id: string, v: string) => setAdjQty((p) => ({ ...p, [id]: v }));

  const adjust = (item: InventoryItem, delta: number) => {
    // Optimistically update the UI immediately
    setInventory((p) => p.map((i) =>
      i.id === item.id ? { ...i, stock: Math.max(0, i.stock + delta) } : i
    ));
    // Accumulate and debounce the network call
    adjPending.current[item.id] = (adjPending.current[item.id] ?? 0) + delta;
    clearTimeout(adjTimers.current[item.id]);
    adjTimers.current[item.id] = setTimeout(async () => {
      const accumulated = adjPending.current[item.id] ?? 0;
      delete adjPending.current[item.id];
      if (accumulated === 0) return;
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjust: accumulated }),
      });
      if (!res.ok) {
        toast("Couldn't update stock.", "error");
        // Revert optimistic update
        setInventory((p) => p.map((i) =>
          i.id === item.id ? { ...i, stock: Math.max(0, i.stock - accumulated) } : i
        ));
        return;
      }
      const updated: InventoryItem = await res.json();
      setInventory((p) => p.map((i) => i.id === updated.id ? updated : i));
    }, 400);
  };

  const saveItem = async () => {
    if (!itemForm || !itemForm.name.trim()) { toast("Name is required.", "error"); return; }
    setItemSaving(true);
    try {
      const body = {
        name: itemForm.name.trim(), category: itemForm.category, unit: itemForm.unit,
        stock: Number(itemForm.stock) || 0, reorder_at: Number(itemForm.reorder_at) || 0,
        cost: Number(itemForm.cost) || 0, supplier: itemForm.supplier, notes: itemForm.notes,
      };
      if (itemForm.id) {
        const res = await fetch(`/api/inventory/${itemForm.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { toast("Couldn't update item.", "error"); return; }
        const updated: InventoryItem = await res.json();
        setInventory((p) => p.map((i) => i.id === updated.id ? updated : i));
      } else {
        const res = await fetch("/api/inventory", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { toast("Couldn't add item.", "error"); return; }
        const created: InventoryItem = await res.json();
        setInventory((p) => [...p, created].sort((a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
      }
      setItemForm(null);
      toast("Item saved.", "success");
    } finally { setItemSaving(false); }
  };

  const deleteItem = async (id: string) => {
    const ok = await confirm({ title: "Delete this item?",
      message: "This removes it from inventory permanently.", confirmText: "Delete", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    if (!res.ok) { toast("Couldn't delete item.", "error"); return; }
    setInventory((p) => p.filter((i) => i.id !== id));
    toast("Item deleted.", "success");
  };

  const totalValue = inventory.reduce((s, i) => s + i.stock * i.cost, 0);

  return (
    <div style={{ padding: isMobile ? "16px 12px 80px" : "24px 24px 48px",
      maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="disp" style={{ fontSize: 20, letterSpacing: 1.5 }}>INVENTORY</div>
        <span style={{ fontSize: 12, color: tokens.faint }}>
          {inventory.length} items · {pkr(totalValue)} total value
        </span>
        <div style={{ flex: 1 }} />
        <button style={{ ...btn(itemForm && !itemForm.id ? "#fef2f2" : "#ff6a2b",
          itemForm && !itemForm.id ? tokens.danger : "#ffffff"), padding: "8px 14px" }}
          onClick={() => setItemForm(itemForm && !itemForm.id ? null : blankItem())}>
          {itemForm && !itemForm.id ? "✕ Cancel" : "+ Add Item"}
        </button>
      </div>

      {/* Low-stock alerts */}
      {lowStock.length > 0 && (
        <div style={{ marginBottom: 16, display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {lowStock.map((item) => (
            <div key={item.id} style={{ background: "#fff1f1",
              border: `1px solid ${tokens.danger}`, borderRadius: 8,
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: tokens.danger }}>
                  {item.stock} {item.unit} left (reorder at {item.reorder_at})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline add/edit form */}
      {itemForm && (
        <div style={{ background: tokens.surfaceAlt, border: `1px solid ${tokens.border}`,
          borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div className="disp" style={{ fontSize: 11, letterSpacing: 2, color: tokens.accent,
            marginBottom: 12 }}>{itemForm.id ? "EDIT ITEM" : "NEW ITEM"}</div>
          <div style={{ display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={isMobile ? { gridColumn: "1 / -1" } : {}}>
              <label style={lbl}>Name</label>
              <input style={fld} value={itemForm.name} placeholder="e.g. Tint Film 50%"
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Category</label>
              <select style={fld} value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
                {INVENTORY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <select style={fld} value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}>
                {STOCK_UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Supplier</label>
              <input style={fld} value={itemForm.supplier} placeholder="Optional"
                onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Current Stock</label>
              <input type="number" style={fld} value={itemForm.stock} min="0"
                onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Reorder At</label>
              <input type="number" style={fld} value={itemForm.reorder_at} min="0"
                onChange={(e) => setItemForm({ ...itemForm, reorder_at: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Cost / Unit (Rs)</label>
              <input type="number" style={fld} value={itemForm.cost} min="0"
                onChange={(e) => setItemForm({ ...itemForm, cost: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <input style={fld} value={itemForm.notes} placeholder="Optional"
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn()} onClick={() => setItemForm(null)}>Cancel</button>
            <button style={{ ...btn("#ff6a2b", "#ffffff"), opacity: itemSaving ? 0.7 : 1 }}
              disabled={itemSaving} onClick={saveItem}>
              {itemSaving ? "Saving…" : itemForm.id ? "Update Item" : "Add Item"}
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["All", ...INVENTORY_CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            style={{ ...btn(catFilter === cat ? tokens.accent : "#f3f4f6",
              catFilter === cat ? "#fff" : "#374151"),
              padding: "6px 12px", fontSize: 12 }}>
            {cat}
            {cat !== "All" && (
              <span style={{ marginLeft: 5, opacity: 0.7 }}>
                {inventory.filter((i) => i.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {visible.length === 0 ? (
        <div style={{ padding: "48px 16px", textAlign: "center", color: tokens.faint,
          background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 10 }}>
          {inventory.length === 0
            ? "No items yet — click + Add Item to start tracking stock."
            : `No ${catFilter} items.`}
        </div>
      ) : isMobile ? (
        /* ── Mobile cards ── */
        <div style={{ display: "grid", gap: 8 }}>
          {visible.map((item) => {
            const isLow = item.reorder_at > 0 && item.stock <= item.reorder_at;
            const adjVal = Number(getAdj(item.id)) || 1;
            return (
              <div key={item.id} style={{ background: tokens.surface,
                border: `1px solid ${isLow ? tokens.danger : tokens.border}`,
                borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: CAT_BADGE[item.category] || tokens.muted,
                        border: `1px solid ${CAT_BADGE[item.category] || tokens.muted}`,
                        borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                        {item.category}
                      </span>
                      {item.supplier && (
                        <span style={{ fontSize: 11, color: tokens.faint }}>{item.supplier}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16,
                      color: isLow ? tokens.danger : tokens.text }}>
                      {item.stock} <span style={{ fontSize: 12, fontWeight: 400 }}>{item.unit}</span>
                    </div>
                    {item.cost > 0 && (
                      <div style={{ fontSize: 11, color: tokens.faint }}>
                        {pkr(item.stock * item.cost)} total
                      </div>
                    )}
                  </div>
                </div>
                {/* Adjust row */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="number" min="0" value={getAdj(item.id)}
                    onChange={(e) => setAdj(item.id, e.target.value)}
                    style={{ ...fld, width: 64, padding: "6px 8px", fontSize: 13, textAlign: "center" }} />
                  <button style={{ ...btn(tokens.success + "22", tokens.success),
                    padding: "6px 12px", fontSize: 12 }}
                    onClick={() => adjust(item, adjVal)}>+ Receive</button>
                  <button style={{ ...btn("#fef2f2", tokens.danger), padding: "6px 12px", fontSize: 12 }}
                    onClick={() => adjust(item, -adjVal)}>− Use</button>
                  <button style={{ ...btn(), padding: "6px 10px", fontSize: 12, marginLeft: "auto" }}
                    onClick={() => setItemForm({ id: item.id, name: item.name,
                      category: item.category, unit: item.unit,
                      stock: String(item.stock), reorder_at: String(item.reorder_at),
                      cost: String(item.cost), supplier: item.supplier, notes: item.notes })}>
                    Edit
                  </button>
                  <button style={{ ...btn("#fef2f2", tokens.danger), padding: "6px 10px", fontSize: 12 }}
                    onClick={() => deleteItem(item.id)}>Del</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop table ── */
        <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`,
          borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.border}`, color: tokens.faint,
                textAlign: "left", fontSize: 11, letterSpacing: 0.5 }}>
                {["Item", "Category", "Stock", "Reorder", "Cost/unit", "Total Value", "Adjust", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const isLow = item.reorder_at > 0 && item.stock <= item.reorder_at;
                const adjVal = Number(getAdj(item.id)) || 1;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${tokens.border}`,
                    background: isLow ? "#fff8f8" : "transparent" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.supplier && (
                        <div style={{ fontSize: 11, color: tokens.faint, marginTop: 2 }}>
                          {item.supplier}
                        </div>
                      )}
                      {item.notes && (
                        <div style={{ fontSize: 11, color: tokens.faint, marginTop: 1 }}>{item.notes}</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600,
                        color: CAT_BADGE[item.category] || tokens.muted,
                        border: `1px solid ${CAT_BADGE[item.category] || tokens.muted}`,
                        borderRadius: 4, padding: "2px 7px" }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontWeight: 700, fontSize: 15,
                        color: isLow ? tokens.danger : tokens.text }}>
                        {item.stock}
                      </span>
                      <span style={{ fontSize: 12, color: tokens.faint, marginLeft: 4 }}>{item.unit}</span>
                      {isLow && <span style={{ marginLeft: 6, fontSize: 14 }}>⚠️</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: tokens.muted }}>
                      {item.reorder_at > 0 ? `${item.reorder_at} ${item.unit}` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: tokens.muted }}>
                      {item.cost > 0 ? pkr(item.cost) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: tokens.accent }}>
                      {item.cost > 0 ? pkr(item.stock * item.cost) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <input type="number" min="0" value={getAdj(item.id)}
                          onChange={(e) => setAdj(item.id, e.target.value)}
                          style={{ ...fld, width: 56, padding: "5px 7px", fontSize: 12,
                            textAlign: "center", minHeight: 0 }} />
                        <button title="Receive stock"
                          style={{ ...btn(tokens.success + "22", tokens.success),
                            padding: "5px 9px", fontSize: 12, minHeight: 0 }}
                          onClick={() => adjust(item, adjVal)}>+</button>
                        <button title="Use stock"
                          style={{ ...btn("#fef2f2", tokens.danger),
                            padding: "5px 9px", fontSize: 12, minHeight: 0 }}
                          onClick={() => adjust(item, -adjVal)}>−</button>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ ...btn(), padding: "5px 9px", fontSize: 11, minHeight: 0 }}
                          onClick={() => setItemForm({ id: item.id, name: item.name,
                            category: item.category, unit: item.unit,
                            stock: String(item.stock), reorder_at: String(item.reorder_at),
                            cost: String(item.cost), supplier: item.supplier, notes: item.notes })}>
                          Edit
                        </button>
                        <button style={{ ...btn("#fef2f2", tokens.danger),
                          padding: "5px 9px", fontSize: 11, minHeight: 0 }}
                          onClick={() => deleteItem(item.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Footer total */}
          {visible.length > 0 && (
            <div style={{ padding: "10px 14px", background: tokens.surfaceAlt,
              borderTop: `1px solid ${tokens.border}`, display: "flex",
              justifyContent: "flex-end", gap: 24, fontSize: 13 }}>
              <span style={{ color: tokens.faint }}>
                {visible.length} item{visible.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontWeight: 700, color: tokens.accent }}>
                {pkr(visible.reduce((s, i) => s + i.stock * i.cost, 0))} stock value
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
