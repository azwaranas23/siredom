'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, KeyRound, Tv, Plus, RefreshCw, Pencil, Trash2, Check, X, FileText } from 'lucide-react';


export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    tenantCode,
    masterTables,
    updateTablePin,
    updateTableName,
    addMasterTable,
    deleteMasterTable,
    getTableMatch,
    setAuth,
  } = useScorerStore();

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState<string>('');
  const [deleteConfirmTableId, setDeleteConfirmTableId] = useState<string | null>(null);

  const handleGenerateNewPin = (tableId: string) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    updateTablePin(tableId, newPin);
  };

  const handleAddNewTable = () => {
    addMasterTable();
  };

  const handleEnterWasitTable = (tableNum: number) => {
    setAuth(true, 'wasit', tenantCode, tableNum);
    router.push('/wasit/live');
  };

  const handleStartEdit = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingTableName(currentName);
  };

  const handleSaveEditName = (tableId: string) => {
    if (editingTableName.trim()) {
      updateTableName(tableId, editingTableName.trim());
    }
    setEditingTableId(null);
  };

  const handleDeleteTableConfirm = (tableId: string) => {
    deleteMasterTable(tableId);
    setDeleteConfirmTableId(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
            Dashboard Pengelola Cafe / Warkop
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Kelola Sesi Meja Wasit, PIN Akses Panitia, Edit & Hapus Meja ({tenantCode})
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/logs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" /> REKAP & LOG PERTANDINGAN
          </Link>

          <button
            onClick={handleAddNewTable}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> TAMBAH MEJA BARU
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
        {masterTables.map((table) => {
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
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold"
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
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Generate PIN Baru"
                  >
                    <RefreshCw className="w-4 h-4" />
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
        })}
      </div>

      {/* Delete Table Confirmation Modal */}
      {deleteConfirmTableId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto text-2xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-xl font-extrabold text-white">Hapus Meja Ini?</h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Meja ini dan seluruh data sesinya akan dihapus secara permanen dari daftar pengelola admin.
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
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all"
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
