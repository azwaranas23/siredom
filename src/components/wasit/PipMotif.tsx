'use client';

import React from 'react';

/**
 * PipMotif — signature visual domino (devlog/0015, Tier 3).
 * Deretan pip sebagai divider/indikator; `count` = jumlah pip aktif (0–9),
 * sisanya diredupkan. Aksen mengikuti token warna mode.
 */
export default function PipMotif({
  count,
  total = 7,
  accent = 'casual',
  size = 'sm',
}: {
  count: number;
  total?: number;
  accent?: 'casual' | 'pordi' | 'orado';
  size?: 'sm' | 'md';
}) {
  const dot = size === 'md' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5';
  const gap = size === 'md' ? 'gap-2' : 'gap-1.5';
  const active =
    accent === 'pordi' ? 'bg-amber-400' : accent === 'orado' ? 'bg-purple-400' : 'bg-cyan-400';
  const idle = 'bg-slate-700';

  return (
    <div className={`flex items-center ${gap}`} aria-hidden="true">
      {Array.from({ length: Math.min(total, 9) }).map((_, i) => (
        <span key={i} className={`rounded-full ${dot} ${i < count ? active : idle}`} />
      ))}
    </div>
  );
}
