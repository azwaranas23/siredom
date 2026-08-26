import React from 'react';
import { redirect } from 'next/navigation';
import { getLatestMatchByTableId } from '@/features/scorer/actions';
import ScorerPadRenderer from '@/components/wasit/ScorerPadRenderer';

interface PageProps {
  params: Promise<{
    tableId: string;
  }>;
}

export default async function LiveTablePage({ params }: PageProps) {
  const { tableId } = await params;

  // Route guard: ambil sesi TERBARU apa pun statusnya.
  // - Belum ada sesi sama sekali  -> arahkan ke setup.
  // - IN_PROGRESS                 -> scorer pad normal.
  // - COMPLETED                   -> scorer pad tetap dirender; MatchFinishedModal
  //                                  menampilkan hasil + opsi mulai sesi baru
  //                                  (devlog/0008 — wasit tak lagi terlempar ke setup).
  const latestMatch = await getLatestMatchByTableId(tableId);

  if (!latestMatch) {
    redirect(`/play/live/${tableId}/setup`);
  }

  return (
    <div className="flex-1 flex flex-col h-dvh overflow-hidden">
      <ScorerPadRenderer
        tableId={tableId}
        rulesetMode={latestMatch.rulesetMode as any}
        matchSession={latestMatch}
      />
    </div>
  );
}
