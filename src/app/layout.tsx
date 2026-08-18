import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="id" className="dark">
      <body className="bg-gray-950 text-white min-h-screen font-sans antialiased selection:bg-cyan-500 selection:text-gray-950">
        {children}
      </body>
    </html>
  );
}
