'use client';

import React from 'react';
import { RulesetMode } from '@/types/domino';
import CasualScorerPad from './CasualScorerPad';
import PordiScorerPad from './PordiScorerPad';
import OradoScorerPad from './OradoScorerPad';

interface ScorerPadRendererProps {
  tableId: string;
  rulesetMode?: RulesetMode;
  matchSession?: any;
}

export default function ScorerPadRenderer({ tableId, rulesetMode = 'CASUAL', matchSession }: ScorerPadRendererProps) {
  const currentMode = (rulesetMode || matchSession?.rulesetMode || 'CASUAL').toUpperCase();

  switch (currentMode) {
    case 'PB_PORDI':
      return <PordiScorerPad tableId={tableId} matchSession={matchSession} />;
    case 'PB_ORADO':
      return <OradoScorerPad tableId={tableId} matchSession={matchSession} />;
    case 'CASUAL':
    default:
      return <CasualScorerPad tableId={tableId} matchSession={matchSession} />;
  }
}
