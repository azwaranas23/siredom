import React from 'react';
import { redirect } from 'next/navigation';
import { getActiveMatchByTableId } from '@/features/scorer/actions';
import ScorerPadRenderer from '@/components/wasit/ScorerPadRenderer';

interface PageProps {
  params: Promise<{
    tableId: string;
  }>;
}

export default async function LiveTablePage({ params }: PageProps) {
  const { tableId } = await params;

  // Query active MatchSession for this tableId
  const activeMatch = await getActiveMatchByTableId(tableId);

  // Route Guard Checklist: If NO active match, redirect to setup
  if (!activeMatch) {
    redirect(`/play/live/${tableId}/setup`);
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-57px)] overflow-hidden">
      <ScorerPadRenderer
        tableId={tableId}
        rulesetMode={activeMatch.rulesetMode as any}
        matchSession={activeMatch}
      />
    </div>
  );
}
