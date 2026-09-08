'use client';

import React from 'react';
import { Check, KeyRound, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { TextField } from '@/components/ui/text-field';
import type { Match, TableMaster } from '@/types/domino';

interface TableCardProps {
  table: TableMaster;
  match: Match;
  editingName: string | null;
  editingValue: string;
  pending: boolean;
  onStartEdit: () => void;
  onEditingValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onRefreshPin: () => void;
  onEnterWasit: () => void;
}

export function TableCard({
  table,
  match,
  editingName,
  editingValue,
  pending,
  onStartEdit,
  onEditingValueChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onRefreshPin,
  onEnterWasit,
}: TableCardProps) {
  const isSetupDone = match.status === 'in_progress';
  const roundsCount = match.rounds.length;
  const isEditing = editingName === table.id;
  const status = isSetupDone && roundsCount > 0
    ? { label: 'Sesi aktif', tone: 'success' as const }
    : isSetupDone
      ? { label: 'Siap main', tone: 'info' as const }
      : { label: 'Belum setup', tone: 'neutral' as const };

  return (
    <Card className="flex min-w-0 flex-col justify-between overflow-hidden p-5">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-md border border-border bg-surface-sunken px-2.5 py-1 font-mono text-xs font-bold text-content-muted">
            MEJA #{table.tableNumber}
          </span>
          <div className="flex items-center gap-1.5">
            <Badge tone={status.tone}>{status.label}</Badge>
            <IconButton variant="quiet" label={`Ubah nama ${table.tableName}`} onClick={onStartEdit}>
              <Pencil className="size-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton variant="quiet" label={`Hapus ${table.tableName}`} onClick={onDelete} className="hover:text-rose-400">
              <Trash2 className="size-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        {isEditing ? (
          <div className="flex items-end gap-1.5">
            <TextField
              label="Nama meja"
              value={editingValue}
              onChange={(event) => onEditingValueChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onSaveEdit()}
              autoFocus
              className="min-w-0"
            />
            <IconButton variant="primary" label="Simpan nama meja" onClick={onSaveEdit} disabled={pending}>
              <Check className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton variant="secondary" label="Batal mengubah nama meja" onClick={onCancelEdit}>
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
        ) : (
          <h2 className="text-base font-extrabold text-content">{table.tableName}</h2>
        )}

        <p className="mt-1 font-mono text-xs text-content-muted">
          {isSetupDone ? `Berjalan (${roundsCount} Ronde)` : 'Data kosong (perlu setup)'}
        </p>

        {isSetupDone && match.players.length > 0 && (
          <section className="mt-3 rounded-lg border border-border bg-surface-sunken/60 p-3" aria-label={`Pemain Meja ${table.tableNumber}`}>
            <h3 className="text-[10px] font-bold uppercase text-content-subtle">Pemain</h3>
            <ul className="mt-1 grid grid-cols-2 gap-1 font-mono text-[11px] font-semibold text-content-muted">
              {match.players.map((player) => <li key={player.id} className="truncate">{player.name}</li>)}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-sunken p-3 font-mono">
          <div>
            <span className="block text-[10px] font-bold uppercase text-content-subtle">PIN wasit meja</span>
            <span className="text-lg font-black tracking-wider text-info">{table.pinCode}</span>
          </div>
          <IconButton variant="quiet" label={`Buat PIN baru untuk ${table.tableName}`} onClick={onRefreshPin} disabled={pending}>
            <RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} aria-hidden="true" />
          </IconButton>
        </div>
        <Button variant="secondary" className="w-full" onClick={onEnterWasit}>
          <KeyRound className="size-3.5 text-info" aria-hidden="true" /> Masuk wasit meja #{table.tableNumber}
        </Button>
      </div>
    </Card>
  );
}
