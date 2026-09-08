'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileText, LayoutDashboard, Plus, RefreshCw, Tv } from 'lucide-react';
import { useScorerStore } from '@/store/useScorerStore';
import { createTable, deleteTable as deleteTableAction, getTablesByTenant, updateTableName as updateTableNameAction, updateTablePin as updateTablePinAction } from '@/app/actions/tableActions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { ConfirmDialog } from '@/components/patterns/confirm-dialog';
import { PageHeader } from '@/components/patterns/page-header';
import { TableCard } from '@/features/admin/components/table-card';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { tenantCode, masterTables, setMasterTables, getTableMatch, setAuth, setMatchFromDb } = useScorerStore();
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState('');
  const [deleteConfirmTableId, setDeleteConfirmTableId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<{ subscriptionPlan: string; maxTables: number } | null>(null);
  const [isQuotaExceededModalOpen, setIsQuotaExceededModalOpen] = useState(false);

  const loadData = async () => {
    if (!tenantCode || !tenantCode.trim()) {
      setMasterTables([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const codeToUse = tenantCode;
      const res = await getTablesByTenant(codeToUse);
      if (res.success) {
        const tables = res.data || [];
        setMasterTables(tables);
        if (res.tenantInfo) setTenantInfo({ subscriptionPlan: res.tenantInfo.subscriptionPlan, maxTables: res.tenantInfo.maxTables });
        for (const table of tables) {
          try {
            const matchResponse = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${table.tableNumber}`);
            const matchJson = await matchResponse.json();
            if (matchJson.data && matchJson.data.players) setMatchFromDb(matchJson.data);
          } catch (error) {
            console.error(`Failed to fetch match for table #${table.tableNumber}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load table data via Server Action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantCode]);

  const maxTablesLimit = tenantInfo?.maxTables || 10;
  const currentTableCount = masterTables.length;

  const handleAddNewTable = () => {
    if (currentTableCount >= maxTablesLimit) {
      setIsQuotaExceededModalOpen(true);
      return;
    }
    startTransition(async () => {
      if (!tenantCode || !tenantCode.trim()) return;
      const res = await createTable(tenantCode);
      if (res.success) await loadData();
      else if (res.isQuotaExceeded) setIsQuotaExceededModalOpen(true);
      else alert(res.error || 'Gagal membuat meja');
    });
  };

  const handleGenerateNewPin = (tableId: string) => {
    startTransition(async () => {
      const res = await updateTablePinAction(tableId);
      if (res.success) await loadData();
    });
  };

  const handleStartEdit = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingTableName(currentName);
  };

  const handleSaveEditName = (tableId: string) => {
    if (!editingTableName.trim()) return;
    startTransition(async () => {
      const res = await updateTableNameAction(tableId, editingTableName.trim());
      if (res.success) await loadData();
      setEditingTableId(null);
    });
  };

  const handleDeleteTableConfirm = (tableId: string) => {
    startTransition(async () => {
      const res = await deleteTableAction(tableId);
      if (res.success) {
        await loadData();
        setDeleteConfirmTableId(null);
      } else {
        alert(res.error || 'Gagal menghapus meja');
      }
    });
  };

  const handleEnterWasitTable = (tableNumber: number) => {
    setAuth(true, 'wasit', tenantCode, tableNumber);
    router.push(`/play/live/${tableNumber}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        title={<><LayoutDashboard className="size-6 text-success" aria-hidden="true" /> Dashboard pengelola cafe / warkop ({tenantCode})</>}
        description="Kelola sesi meja wasit dan PIN akses panitia."
        meta={<span className="font-bold text-success">Paket: {(tenantInfo?.subscriptionPlan || 'pro').toUpperCase()} · Kuota {currentTableCount}/{maxTablesLimit} meja</span>}
        actions={
          <>
            <IconButton variant="secondary" label="Muat ulang daftar meja" onClick={loadData} disabled={isLoading || isPending}>
              <RefreshCw className={`size-4 ${isLoading || isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
            </IconButton>
            <Link href="/admin/logs" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-info px-4 text-xs font-extrabold text-slate-950 transition-colors hover:brightness-110">
              <FileText className="size-4" aria-hidden="true" /> Rekap & log pertandingan
            </Link>
            <Button variant={currentTableCount >= maxTablesLimit ? 'secondary' : 'primary'} onClick={handleAddNewTable} disabled={isPending}>
              <Plus className="size-4" aria-hidden="true" /> Tambah meja ({currentTableCount}/{maxTablesLimit})
            </Button>
            <Link href="/admin/leaderboard-tv" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-warning px-4 text-xs font-extrabold text-slate-950 transition-colors hover:brightness-110">
              <Tv className="size-4" aria-hidden="true" /> Buka spectator TV
            </Link>
          </>
        }
      />

      <section aria-label="Daftar meja pertandingan" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <Card className="col-span-full p-8 text-center font-mono font-bold text-content-muted">Memuat data meja dari database…</Card>
        ) : masterTables.length === 0 ? (
          <Card className="col-span-full p-8 text-center font-mono font-bold text-content-muted">Belum ada meja tersimpan. Klik “Tambah meja” untuk membuat meja pertama.</Card>
        ) : masterTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            match={getTableMatch(table.tableNumber)}
            editingName={editingTableId}
            editingValue={editingTableName}
            pending={isPending}
            onStartEdit={() => handleStartEdit(table.id, table.tableName)}
            onEditingValueChange={setEditingTableName}
            onSaveEdit={() => handleSaveEditName(table.id)}
            onCancelEdit={() => setEditingTableId(null)}
            onDelete={() => setDeleteConfirmTableId(table.id)}
            onRefreshPin={() => handleGenerateNewPin(table.id)}
            onEnterWasit={() => handleEnterWasitTable(table.tableNumber)}
          />
        ))}
      </section>

      <Dialog
        open={isQuotaExceededModalOpen}
        onOpenChange={setIsQuotaExceededModalOpen}
        title="Batas kuota meja tercapai"
        description={<>Paket <strong className="uppercase text-warning">{tenantInfo?.subscriptionPlan || 'basic'}</strong> membatasi maksimal <strong className="text-content">{maxTablesLimit} meja pertandingan</strong>.</>}
        footer={<Button onClick={() => setIsQuotaExceededModalOpen(false)}>Saya mengerti</Button>}
      >
        <div className="rounded-lg border border-border bg-surface-sunken p-4 font-mono text-xs text-content-muted">
          <div className="flex items-center gap-2 font-bold text-warning"><AlertTriangle className="size-4" aria-hidden="true" /> Cara menambah meja</div>
          <p className="mt-2">Hubungi Super Admin SIREDOM untuk mengubah paket billing tenant.</p>
          <ul className="mt-2 space-y-1 font-bold text-info"><li>Paket Pro: kuota 10 meja</li><li>Paket Enterprise: kuota 25 meja</li></ul>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteConfirmTableId)}
        onOpenChange={(open) => !open && setDeleteConfirmTableId(null)}
        title="Hapus meja ini?"
        description="Meja ini dan seluruh data sesinya akan dihapus permanen dari basis data melalui Server Action."
        confirmLabel="Ya, hapus meja"
        onConfirm={() => deleteConfirmTableId && handleDeleteTableConfirm(deleteConfirmTableId)}
        pending={isPending}
        tone="danger"
      />
    </div>
  );
}
