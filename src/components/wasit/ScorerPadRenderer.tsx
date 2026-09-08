'use client';

import React, { useEffect, useState } from 'react';
import { RulesetMode } from '@/types/domino';
import { useScorerStore } from '@/store/useScorerStore';
import CasualScorerPad from './CasualScorerPad';
import PordiScorerPad from './PordiScorerPad';
import OradoScorerPad from './OradoScorerPad';
import { MatchFinishedModal } from './MatchFinishedModal';

interface ScorerPadRendererProps {
  tableId: string;
  rulesetMode?: RulesetMode;
  matchSession?: any;
}

export default function ScorerPadRenderer({ tableId, rulesetMode = 'CASUAL', matchSession }: ScorerPadRendererProps) {
  const currentMode = (rulesetMode || matchSession?.rulesetMode || 'CASUAL').toUpperCase();

  const storeMatchId = useScorerStore((s) => s.match.id);
  const isMatchCompleted = useScorerStore((s) => s.match.status === 'completed');
  const setMatchFromDb = useScorerStore((s) => s.setMatchFromDb);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Ticket GH#14: dismiss lokal — "SELESAI & TUTUP" menutup popup tanpa
  // mengubah status; reset otomatis saat status keluar dari completed.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!isMatchCompleted) setDismissed(false);
  }, [isMatchCompleted]);

  // Sinkronisasi awal & refresh: pastikan store memuat sesi dari DB (devlog/0021).
  useEffect(() => {
    if (matchSession?.id) {
      setMatchFromDb(matchSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchSession?.id]);

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-[#0D0F12] flex items-center justify-center font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest font-bold">Memuat Arena Wasit...</span>
        </div>
      </div>
    );
  }

  const pad = (() => {
    switch (currentMode) {
      case 'PB_PORDI':
        return <PordiScorerPad tableId={tableId} matchSession={matchSession} />;
      case 'PB_ORADO':
        return <OradoScorerPad tableId={tableId} matchSession={matchSession} />;
      case 'CASUAL':
      default:
        return <CasualScorerPad tableId={tableId} matchSession={matchSession} />;
    }
  })();

  return (
    <>
      {pad}
      {/* Pop-up hasil (PRD Bagian 2.3) — SELESAI & TUTUP hanya dismiss (GH#14) */}
      <MatchFinishedModal
        isOpen={isMatchCompleted && !dismissed}
        onClose={() => setDismissed(true)}
      />
    </>
  );
}
