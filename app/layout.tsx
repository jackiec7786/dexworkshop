import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spice Workshop",
  description: "Inspection, quotes & invoices for auto detailing workshops",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; -webkit-font-smoothing:antialiased; }
          body { font-family:'Roboto Mono',ui-monospace,monospace; background:#0c0d0f; color:#e9ecef; }
          input:focus,textarea:focus,select:focus { outline:none; border-color:#ff6a2b !important; }
          .disp { font-family:'Oswald',sans-serif; }
          @media print {
            body * { visibility:hidden; }
            #printable, #printable * { visibility:visible; }
            #printable { position:absolute; left:0; top:0; width:100%; background:#fff; color:#000; }
            .noprint { display:none !important; }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
