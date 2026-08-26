import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

// Ticket GH#19 — Font display identitas (ADR-0002): nuansa papan skor,
// hanya untuk heading/judul besar; data & angka tetap monospace.
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIREDOM - Sistem Rekapitulasi Domino Gamified SaaS',
  description: 'Multi-Tenant Gamified SaaS for Domino Tournament Scoring, Live TV Spectator Telemetry & Match Auditing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`dark ${archivo.variable}`}>
      <body className="bg-gray-950 text-white min-h-screen font-sans antialiased selection:bg-cyan-500 selection:text-gray-950">
        {children}
      </body>
    </html>
  );
}
