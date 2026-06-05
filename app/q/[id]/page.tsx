"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Job, Settings, PrintDoc } from "@/components/shared";

const DEFAULT_SETTINGS: Settings = {
  biz_name: "DEX Workshop", tagline: "", phone: "", email: "", address: "", currency: "Rs", tax_rate: 0,
};

export default function PublicQuotePage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/public/jobs/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ job, settings: s }) => {
        setJob(job);
        if (s) setSettings(s);
      })
      .catch(() => setError(true));
  }, [id]);

  if (error) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center",
      fontFamily: "ui-monospace,monospace", color: "#6b7280" }}>
      Quote not found.
    </div>
  );

  if (!job) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center",
      fontFamily: "ui-monospace,monospace", color: "#9ca3af" }}>
      Loading…
    </div>
  );

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 48px" }}>
      <PrintDoc job={job} settings={settings} mode="quote" />
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={() => window.print()}
          style={{ background: "#ff6a2b", color: "#fff", border: "none", borderRadius: 6,
            padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "ui-monospace,monospace" }}>
          🖨 Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
