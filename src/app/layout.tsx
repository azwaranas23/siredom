import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-mono',
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
    <html lang="id" className={`dark ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased selection:bg-brand-cyan selection:text-background">
        {children}
      </body>
    </html>
  );
}

