'use client';

import React, { useEffect } from 'react';
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

  // Sinkronisasi awal: pastikan store memuat sesi dari DB (mis. wasit membuka
  // langsung URL meja yang statusnya COMPLETED — devlog/0008).
  useEffect(() => {
    if (matchSession?.id && matchSession.id !== storeMatchId) {
      setMatchFromDb(matchSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchSession?.id]);

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
      {/* Akhirnya terpasang (devlog/0008): pop-up "Pertandingan Berakhir" sesuai PRD Bagian 2.3 */}
      <MatchFinishedModal isOpen={isMatchCompleted} />
    </>
  );
}
