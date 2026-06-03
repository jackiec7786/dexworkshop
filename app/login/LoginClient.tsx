"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner, tokens, fieldStyle, useToast } from "@/components/ui";

type Mode = "loading" | "login" | "setup";

export default function LoginClient() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("loading");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Decide between first-run setup and normal login.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        if (data.authenticated) { router.replace("/"); return; }
        setMode(data.needsSetup ? "setup" : "login");
      } catch {
        setMode("login");
      }
    })();
  }, [router]);

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const endpoint = mode === "setup" ? "/api/auth/setup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      toast(mode === "setup" ? "Account created." : "Welcome back.", "success");
      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 20 }}>
      <div style={{
        width: 380, maxWidth: "100%", background: tokens.surface,
        border: `1px solid ${tokens.borderHi}`, borderRadius: 14, padding: 32,
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dex-logo.png" alt="DEX" style={{ height: 52, objectFit: "contain" }} />
        </div>

        {mode === "loading" ? (
          <div style={{ display: "grid", placeItems: "center", padding: "24px 0" }}>
            <Spinner label="Loading…" />
          </div>
        ) : (
          <>
            <h1 className="disp" style={{ fontSize: 20, letterSpacing: 1, marginBottom: 4 }}>
              {mode === "setup" ? "CREATE SHOP ACCOUNT" : "SIGN IN"}
            </h1>
            <p style={{ color: tokens.faint, fontSize: 12, marginBottom: 20 }}>
              {mode === "setup"
                ? "Set up the single owner account for this workshop."
                : "Enter your workshop credentials to continue."}
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              <input
                placeholder="Email" type="email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)} style={fieldStyle}
              />
              <input
                placeholder="Password" type="password" value={pw}
                autoComplete={mode === "setup" ? "new-password" : "current-password"}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} style={fieldStyle}
              />
              <Button variant="primary" disabled={busy} onClick={submit} style={{ padding: 11 }}>
                {busy ? "…" : mode === "setup" ? "Create Account" : "Sign In"}
              </Button>
              {error && <div style={{ fontSize: 13, color: tokens.danger }}>{error}</div>}
              {mode === "setup" && (
                <div style={{ fontSize: 11, color: tokens.faint, lineHeight: 1.5 }}>
                  Password must be at least 8 characters. This account can&apos;t be created again
                  once it exists.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
