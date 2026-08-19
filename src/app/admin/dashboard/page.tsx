'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, KeyRound, Tv, Plus, RefreshCw, Pencil, Trash2, Check, X, FileText, AlertTriangle } from 'lucide-react';
import { TableMaster } from '@/types/domino';
import {
  getTablesByTenant,
  createTable,
  updateTableName as updateTableNameAction,
  updateTablePin as updateTablePinAction,
  deleteTable as deleteTableAction,
} from '@/app/actions/tableActions';

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    tenantCode,
    masterTables,
    setMasterTables,
    getTableMatch,
    setAuth,
    setMatchFromDb,
  } = useScorerStore();

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState<string>('');
  const [deleteConfirmTableId, setDeleteConfirmTableId] = useState<string | null>(null);

  // Server Action Loading & Transition states
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Quota & Plan Enforcement States
  const [tenantInfo, setTenantInfo] = useState<{ subscriptionPlan: string; maxTables: number } | null>(null);
  const [isQuotaExceededModalOpen, setIsQuotaExceededModalOpen] = useState(false);

  // Fetch Tables & Tenant Info via Server Action on mount & tenantCode change
  const loadData = async () => {
    setIsLoading(true);
    try {
      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      const res = await getTablesByTenant(codeToUse);

      if (res.success) {
        const tables = res.data || [];
        setMasterTables(tables);

        if (res.tenantInfo) {
          setTenantInfo({
            subscriptionPlan: res.tenantInfo.subscriptionPlan,
            maxTables: res.tenantInfo.maxTables,
          });
        }

        // Fetch active DB matches for each table so status ("SIAP MAIN" / "SESI AKTIF") updates instantly
        for (const tbl of tables) {
          try {
            const mRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tbl.tableNumber}`);
            const mJson = await mRes.json();
            if (mJson.data && mJson.data.players) {
              setMatchFromDb(mJson.data);
            }
          } catch (e) {
            console.error(`Failed to fetch match for table #${tbl.tableNumber}:`, e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load table data via Server Action:', err);
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
      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      const res = await createTable(codeToUse);

      if (res.success) {
        await loadData();
      } else if (res.isQuotaExceeded) {
        setIsQuotaExceededModalOpen(true);
      } else {
        alert(res.error || 'Gagal membuat meja');
      }
    });
  };

  const handleGenerateNewPin = (tableId: string) => {
    startTransition(async () => {
      const res = await updateTablePinAction(tableId);
      if (res.success) {
        await loadData();
      }
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
      if (res.success) {
        await loadData();
      }
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

  const handleEnterWasitTable = (tableNum: number) => {
    setAuth(true, 'wasit', tenantCode, tableNum);
    router.push('/wasit/live');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
            Dashboard Pengelola Cafe / Warkop ({tenantCode})
          </h1>
          <div className="flex items-center gap-3 mt-1 font-mono text-xs text-slate-400">
            <span>Kelola Sesi Meja Wasit & PIN Akses Panitia</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">
              Paket: {(tenantInfo?.subscriptionPlan || 'pro').toUpperCase()} (Kuota: {currentTableCount}/{maxTablesLimit} Meja)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={loadData}
            disabled={isLoading || isPending}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh Meja dari Prisma Database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isPending ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admin/logs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" /> REKAP & LOG PERTANDINGAN
          </Link>

          <button
            onClick={handleAddNewTable}
            disabled={isPending}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              currentTableCount >= maxTablesLimit
                ? 'bg-amber-600/80 hover:bg-amber-600 text-slate-950 shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-600/20'
            }`}
          >
            <Plus className="w-4 h-4" /> TAMBAH MEJA BARU ({currentTableCount}/{maxTablesLimit})
          </button>

          <Link
            href="/admin/leaderboard-tv"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Tv className="w-4 h-4" /> BUKA SPECTATOR TV
          </Link>
        </div>
      </div>

      {/* Table Master Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 font-mono font-bold">
            Memuat data meja dari Supabase PostgreSQL via Server Action...
          </div>
        ) : masterTables.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 font-mono font-bold">
            Belum ada meja tersimpan di database. Klik tombol "TAMBAH MEJA BARU" di atas.
          </div>
        ) : (
          masterTables.map((table) => {
            const tMatch = getTableMatch(table.tableNumber);
            const isSetupDone = tMatch && tMatch.status === 'in_progress';
            const roundsCount = tMatch?.rounds?.length || 0;
            const isEditing = editingTableId === table.id;

            return (
              <div
                key={table.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden"
              >
                <div>
                  {/* Header Row: Table #, Status Badge, Edit & Delete Buttons */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 border border-slate-800">
                      MEJA #{table.tableNumber}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isSetupDone && roundsCount > 0
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80 animate-pulse'
                            : isSetupDone
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                      >
                        {isSetupDone && roundsCount > 0
                          ? '● SESI AKTIF'
                          : isSetupDone
                          ? 'SIAP MAIN'
                          : 'BELUM SETUP'}
                      </span>

                      {/* Edit Name Button */}
                      <button
                        onClick={() => handleStartEdit(table.id, table.tableName)}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors"
                        title="Edit Nama Meja"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Table Button */}
                      <button
                        onClick={() => setDeleteConfirmTableId(table.id)}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                        title="Hapus Meja"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Table Title / Inline Edit Field */}
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 my-1">
                      <input
                        type="text"
                        value={editingTableName}
                        onChange={(e) => setEditingTableName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditName(table.id)}
                        className="bg-slate-950 border border-cyan-500 rounded-lg px-2.5 py-1 text-sm font-extrabold text-white focus:outline-none w-full"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditName(table.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold disabled:opacity-50"
                        title="Simpan"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingTableId(null)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold"
                        title="Batal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-base font-extrabold text-white">{table.tableName}</h3>
                  )}

                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {isSetupDone
                      ? `Berjalan (${roundsCount} Ronde)`
                      : 'Data Kosong (Perlu Setup)'}
                  </p>

                  {/* Show Players if setup */}
                  {isSetupDone && tMatch.players && (
                    <div className="mt-3 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Pemain Meja #{table.tableNumber}:</span>
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold text-slate-200">
                        {tMatch.players.map((p) => (
                          <div key={p.id} className="truncate">
                            • {p.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        PIN WASIT MEJA
                      </span>
                      <span className="text-lg font-black text-cyan-400 tracking-wider">
                        {table.pinCode}
                      </span>
                    </div>

                    <button
                      onClick={() => handleGenerateNewPin(table.id)}
                      disabled={isPending}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                      title="Generate PIN Baru"
                    >
                      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleEnterWasitTable(table.tableNumber)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700 shadow-md"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> MASUK WASIT MEJA #{table.tableNumber}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quota Exceeded Notification Modal */}
      {isQuotaExceededModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/60 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto text-3xl shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Batas Kuota Meja Tercapai!</h3>
              <p className="text-xs text-slate-300 font-mono leading-relaxed mt-2">
                Paket Billing Anda (<strong className="text-amber-400 uppercase">{tenantInfo?.subscriptionPlan || 'basic'}</strong>) membatasi maksimal <strong className="text-white">{maxTablesLimit} Meja Pertandingan</strong>.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left font-mono text-xs space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">💡 CARA MENAMBAH MEJA:</span>
              <p className="text-slate-300 text-[11px] leading-normal">
                Untuk membuka kuota meja tambahan, silakan hubungi <strong>Super Admin SIREDOM</strong> untuk mengupgrade Paket Billing tenant Anda ke:
              </p>
              <ul className="text-[11px] text-cyan-300 space-y-1 pt-1 font-bold">
                <li>• Paket Pro: Kuota 10 Meja</li>
                <li>• Paket Enterprise: Kuota 25 Meja</li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsQuotaExceededModalOpen(false)}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all"
              >
                SAYA MENGERTI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Confirmation Modal */}
      {deleteConfirmTableId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto text-2xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-xl font-extrabold text-white">Hapus Meja Ini?</h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Meja ini dan seluruh data sesinya akan dihapus secara permanen dari basis data Supabase PostgreSQL via Server Action.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTableId(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteTableConfirm(deleteConfirmTableId)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                Ya, Hapus Meja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
