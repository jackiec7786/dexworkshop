import type { Metadata } from "next";
import { Providers } from "@/components/ui";

export const metadata: Metadata = {
  title: "DEX Workshop — Inspection, Quotes & Invoices",
  description: "Inspection, quote and invoice manager for auto detailing, PDR, tint, wrap and PPF shops.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DEX Workshop" />
        <meta name="theme-color" content="#ff6a2b" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/dex-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; -webkit-font-smoothing:antialiased; }
          body { font-family:'Roboto Mono',ui-monospace,monospace; background:#f5f5f5; color:#111827; }
          input:focus,textarea:focus,select:focus { outline:none; border-color:#ff6a2b !important; box-shadow:0 0 0 3px rgba(255,106,43,0.15); }
          button:focus-visible { outline:2px solid #ff6a2b; outline-offset:2px; }
          button:hover:not(:disabled) { filter:brightness(0.95); }
          button:active:not(:disabled) { filter:brightness(0.90); }
          .disp { font-family:'Oswald',sans-serif; }

          /* ── Desktop left nav ── */
          .dsk-nav {
            width: 210px;
            flex-shrink: 0;
            background: #f5efe6;
            border-right: 1px solid #e5d5c0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            position: sticky;
            top: 0;
            overflow-y: auto;
            z-index: 20;
          }
          @media (max-width: 767px) { .dsk-nav { display: none !important; } }

          /* ── Responsive layout shell ── */
          .app-shell {
            display: grid;
            grid-template-columns: 320px 1fr;
            min-height: calc(100vh - 56px);
          }
          .sidebar {
            background: #f9fafb;
            border-right: 1px solid #e5e7eb;
            padding: 14px;
            overflow-y: auto;
            height: calc(100vh - 56px);
            position: sticky;
            top: 56px;
          }
          .main-pane { background: #ffffff; padding: 22px; }

          /* ── Column helpers ── */
          .cols-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
          .cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

          /* ── Code picker strip ── */
          .code-strip {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 6px;
            margin-bottom: 10px;
          }

          /* ── Mobile bottom nav (hidden on desktop) ── */
          .mob-nav { display: none; background: #ffffff; border-top: 1px solid #e5e7eb; }

          /* ── Print ── */
          @media print {
            @page { margin: 14mm 16mm; size: A4; }
            body * { visibility:hidden; }
            #printable, #printable * { visibility:visible; }
            #printable { position:absolute; left:0; top:0; width:100%; background:#fff; color:#000;
              -webkit-print-color-adjust:exact; print-color-adjust:exact; }
            .noprint { display:none !important; }
          }

          /* ── Mobile styles ── */
          @media (max-width: 767px) {
            html, body { overflow-x: hidden; width: 100%; }

            /* Single-column shell */
            .app-shell { grid-template-columns: 1fr; min-height: calc(100vh - 56px); }

            /* Panel switching via JS-set data-panel attribute */
            .app-shell[data-panel="detail"] .sidebar { display: none !important; }
            .app-shell[data-panel="list"] .main-pane { display: none !important; }

            /* Sidebar: natural height, no border */
            .sidebar {
              height: auto;
              position: static;
              border-right: none;
              border-bottom: 1px solid #e5e7eb;
              padding: 12px;
              padding-bottom: 80px;
            }

            /* Main: tighter padding, room for bottom nav */
            .main-pane { padding: 12px 12px 80px; overflow-x: hidden; }

            /* Grids collapse to one column */
            .cols-3 { grid-template-columns: 1fr; }
            .cols-2 { grid-template-columns: 1fr; }

            /* Code strip: fixed-width cells, horizontal scroll */
            .code-strip {
              grid-template-columns: repeat(8, 60px);
              overflow-x: auto;
              padding-bottom: 6px;
              scrollbar-width: none;
              margin-bottom: 10px;
            }
            .code-strip::-webkit-scrollbar { display: none; }

            /* Bottom nav */
            .mob-nav {
              display: flex;
              position: fixed;
              bottom: 0; left: 0; right: 0;
              z-index: 30;
              background: #ffffff;
              border-top: 1px solid #e5e7eb;
              box-shadow: 0 -1px 8px rgba(0,0,0,0.06);
              padding-bottom: env(safe-area-inset-bottom, 0);
            }

            /* Touch targets */
            input, select, textarea { min-height: 44px; }
          }
        `}</style>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
