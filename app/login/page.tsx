"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setMsg("");
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password: pw })
      : supabase.auth.signUp({ email, password: pw });
    const { error } = await fn;
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (mode === "signup") { setMsg("Account created. You can sign in now."); setMode("signin"); return; }
    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 20 }}>
      <div style={{ width: 360, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dex-logo.png" alt="DEX" style={{ height: 56, objectFit: "contain" }} />
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
          <input placeholder="Password" type="password" value={pw}
            onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} style={inp} />
          <button disabled={busy} onClick={go} style={{
            background: "#ff6a2b", color: "#0c0d0f", border: "none", borderRadius: 6,
            padding: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {busy ? "…" : mode === "signin" ? "Sign In" : "Create Account"}</button>
          {msg && <div style={{ fontSize: 13, color: "#ffb86b" }}>{msg}</div>}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            style={{ background: "none", border: "none", color: "#7a818b", cursor: "pointer",
              fontSize: 13, fontFamily: "inherit", marginTop: 4 }}>
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}</button>
        </div>
      </div>
    </div>
  );
}
const inp = { background: "#16181c", border: "1px solid #2a2e35", borderRadius: 6,
  color: "#e9ecef", padding: "11px", fontSize: 14, fontFamily: "inherit", width: "100%" } as const;
