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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; -webkit-font-smoothing:antialiased; }
          body { font-family:'Roboto Mono',ui-monospace,monospace; background:#0c0d0f; color:#e9ecef; }
          input:focus,textarea:focus,select:focus { outline:none; border-color:#ff6a2b !important; }
          button:hover:not(:disabled) { filter:brightness(1.08); }
          .disp { font-family:'Oswald',sans-serif; }
          @media print {
            body * { visibility:hidden; }
            #printable, #printable * { visibility:visible; }
            #printable { position:absolute; left:0; top:0; width:100%; background:#fff; color:#000; }
            .noprint { display:none !important; }
          }
        `}</style>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
