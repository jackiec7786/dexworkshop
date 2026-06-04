"use client";
import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type CSSProperties, type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Design tokens — the single source of truth for the app's visual language.
// ---------------------------------------------------------------------------
export const tokens = {
  bg: "#f5f5f5",
  surface: "#ffffff",
  surfaceAlt: "#f9fafb",
  surfaceHi: "#f3f4f6",
  border: "#e5e7eb",
  borderHi: "#d1d5db",
  text: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  accent: "#ff6a2b",
  success: "#16a34a",
  info: "#0369a1",
  warn: "#b45309",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
} as const;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
type BtnVariant = "primary" | "default" | "danger" | "ghost";
const btnStyles: Record<BtnVariant, CSSProperties> = {
  primary: { background: tokens.accent, color: "#ffffff" },
  default: { background: tokens.surfaceHi, color: tokens.text },
  danger: { background: tokens.dangerBg, color: tokens.danger },
  ghost: { background: "transparent", color: tokens.muted },
};

export function Button({
  variant = "default", style, children, ...rest
}: { variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{
        border: "none", borderRadius: 6, padding: "9px 14px", fontSize: 13, fontWeight: 600,
        cursor: rest.disabled ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: 0.3,
        opacity: rest.disabled ? 0.6 : 1, transition: "filter .12s ease",
        ...btnStyles[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 18, label }: { size?: number; label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: tokens.faint }}>
      <span
        style={{
          width: size, height: size, borderRadius: "50%",
          border: `2px solid ${tokens.borderHi}`, borderTopColor: tokens.accent,
          display: "inline-block", animation: "dex-spin .7s linear infinite",
        }}
      />
      {label}
    </span>
  );
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ fontSize: 10, color, border: `1px solid ${color}`, borderRadius: 4, padding: "1px 6px" }}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };
const ToastCtx = createContext<(message: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const toastColor: Record<ToastKind, string> = {
  success: tokens.success, error: tokens.danger, info: tokens.info,
};

// ---------------------------------------------------------------------------
// Confirm dialog (promise-based replacement for window.confirm)
// ---------------------------------------------------------------------------
type ConfirmOpts = { title: string; message?: string; confirmText?: string; danger?: boolean };
const ConfirmCtx = createContext<(opts: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const [confirmState, setConfirmState] = useState<
    (ConfirmOpts & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    []
  );

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        <style>{`@keyframes dex-spin{to{transform:rotate(360deg)}}
          @keyframes dex-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
        {children}

        {/* Toast stack */}
        <div className="noprint" style={{
          position: "fixed", right: 16, bottom: 16, display: "grid", gap: 8, zIndex: 100, maxWidth: 360,
        }}>
          {toasts.map((t) => (
            <div key={t.id} role="status" style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderLeft: `3px solid ${toastColor[t.kind]}`,
              color: tokens.text, padding: "11px 14px",
              borderRadius: 8, fontSize: 13,
              boxShadow: "0 4px 16px rgba(0,0,0,.10)",
              animation: "dex-toast-in .18s ease",
            }}>
              {t.message}
            </div>
          ))}
        </div>

        {/* Confirm modal */}
        {confirmState && (
          <div className="noprint" onClick={() => closeConfirm(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid",
            placeItems: "center", zIndex: 110,
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: tokens.surface, padding: 24, borderRadius: 12, width: 400, maxWidth: "90vw",
              border: `1px solid ${tokens.border}`,
              boxShadow: "0 8px 32px rgba(0,0,0,.12)",
            }}>
              <h3 className="disp" style={{ margin: 0, fontSize: 18, letterSpacing: 0.5, color: tokens.text }}>
                {confirmState.title}
              </h3>
              {confirmState.message && (
                <p style={{ color: tokens.muted, fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
                  {confirmState.message}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => closeConfirm(false)}>Cancel</Button>
                <Button variant={confirmState.danger ? "danger" : "primary"} onClick={() => closeConfirm(true)}>
                  {confirmState.confirmText ?? "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

// Shared input styles reused across forms.
export const fieldStyle: CSSProperties = {
  background: tokens.surfaceAlt, border: `1px solid ${tokens.borderHi}`, borderRadius: 6,
  color: tokens.text, padding: "9px 11px", fontSize: 14, width: "100%",
  boxSizing: "border-box", fontFamily: "inherit",
};
export const labelStyle: CSSProperties = {
  fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: tokens.faint,
  marginBottom: 5, display: "block", fontWeight: 600,
};

export function Field({
  label, value, onChange, ...rest
}: { label: string; value: string; onChange: (v: string) => void } &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={fieldStyle} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

export function useStableId() {
  return useMemo(() => Math.random().toString(36).slice(2), []);
}
