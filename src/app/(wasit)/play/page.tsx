'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { verifyTablePinAction } from '@/app/actions/tableActions';
import { getOrCreateDeviceId } from '@/lib/device';
import { Dices, Lock, ShieldCheck, RefreshCw } from 'lucide-react';

interface TableMasterItem {
  id: string;
  tableNumber: number;
  tableName: string;
  status: 'active' | 'idle' | 'maintenance' | 'IN_MATCH' | 'AVAILABLE' | string;
  isLocked: boolean;
}

export default function PlayPortalPage() {
  const router = useRouter();
  const { setAuth } = useScorerStore();

  const [tables, setTables] = useState<TableMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableMasterItem | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [tenantCode, setTenantCode] = useState('');

  const fetchTables = async () => {
    const code = tenantCode.trim();
    if (!code) {
      setFetchError('Masukkan Kode Penyelenggara terlebih dahulu');
      setTables([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/matches?tenantCode=${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json.masterTables && Array.isArray(json.masterTables) && json.masterTables.length > 0) {
        setTables(json.masterTables);
      } else {
        setTables([]);
        setFetchError(json.message || json.error || `Penyelenggara "${code}" belum memiliki meja terdaftar`);
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      setTables([]);
      setFetchError('Gagal terhubung ke server. Periksa koneksi lalu coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantCode.trim()) {
      setTables([]);
      setIsLoading(false);
      setFetchError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNumpadPress = (digit: string) => {
    setPinError(null);
    if (digit === 'CLEAR') {
      setPinInput('');
    } else if (digit === 'DEL') {
      setPinInput((prev) => prev.slice(0, -1));
    } else if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      if (nextPin.length === 4 && selectedTable) {
        verifyPin(nextPin, selectedTable);
      }
    }
  };

  // Verifikasi dilakukan sepenuhnya di server (pinCode tidak pernah dikirim ke klien).
  const verifyPin = async (pin: string, table: TableMasterItem) => {
    setIsVerifying(true);
    setPinError(null);
    try {
      const res = await verifyTablePinAction({
        tenantCode: tenantCode.trim(),
        tableNumber: table.tableNumber,
        pin,
        deviceId: getOrCreateDeviceId(),
      });

      if (!res.success) {
        setPinError(res.error || 'PIN Meja salah. Coba lagi.');
        setTimeout(() => {
          setPinInput('');
          setPinError(null);
        }, 1200);
        return;
      }

      setAuth(true, res.role || 'wasit', res.tenantCode || '', res.tableNumber || table.tableNumber);

      const targetPath = res.hasActiveMatch ? `/play/live/${res.tableId}` : `/play/live/${res.tableId}/setup`;
      router.push(targetPath);
    } catch (err: any) {
      setPinError(err?.message || 'Gagal memverifikasi PIN. Coba lagi.');
      setTimeout(() => {
        setPinInput('');
        setPinError(null);
      }, 1200);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header Logo */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-3 md:pb-4 pt-1 md:pt-2">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center font-black text-cyan-400 text-2xl shadow-inner shrink-0">
            <Dices className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-extrabold text-white tracking-wide font-display">SIREDOM v2.0</h1>
            <p className="text-[10px] md:text-xs text-slate-400 font-mono">Permainan Domino â€¢ Portal Meja</p>
          </div>
        </div>

        <button
          onClick={fetchTables}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Refresh Daftar Meja"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tenant Code Input */}
      <div className="max-w-5xl mx-auto w-full md:w-full mt-4 md:mt-6 mb-5 md:mb-6">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">KODE PENYELENGGARA</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tenantCode}
            onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSelectedTable(null);
                fetchTables();
              }
            }}
            placeholder="CONTOH: TAB-SLOWBAR"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500 uppercase text-sm md:text-base"
          />
          <button
            onClick={() => {
              setSelectedTable(null);
              fetchTables();
            }}
            disabled={!tenantCode.trim() || isLoading}
            className="px-4 md:px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs md:text-sm font-black uppercase tracking-wider transition-colors shrink-0"
          >
            Cari
          </button>
        </div>
      </div>

      {/* Main Content Area - Stacked on mobile, side-by-side on tablet/desktop */}
      <div className="max-w-5xl mx-auto w-full md:w-full mt-1 md:mt-2 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
        {/* Left Column: Table Selection Grid */}
        <div className="lg:col-span-7 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between font-mono">
            <h2 className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider">
              1. Pilih Meja Pertandingan
            </h2>
            <span className="text-[10px] md:text-xs text-slate-500">{tables.length} MEJA TERDAFTAR</span>
          </div>

          {isLoading ? (
            <div className="p-6 md:p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl space-y-3 font-mono">
              <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[11px] md:text-xs text-slate-400">Memuat status meja...</p>
            </div>
          ) : fetchError ? (
            <div className="p-6 md:p-10 text-center bg-slate-900/60 border border-slate-800 rounded-2xl md:rounded-3xl space-y-3 font-mono">
              <Lock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-[11px] md:text-xs text-amber-400">{fetchError}</p>
              <p className="text-[10px] text-slate-500">Masukkan Kode Penyelenggara yang valid, lalu tekan Cari.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-3.5 font-mono">
              {tables.map((table) => {
                const isSelected = selectedTable?.id === table.id || selectedTable?.tableNumber === table.tableNumber;
                const isInMatch = table.status === 'IN_MATCH' || table.isLocked;

                return (
                  <button
                    key={table.id || table.tableNumber}
                    onClick={() => {
                      setSelectedTable(table);
                      setPinInput('');
                      setPinError(null);
                    }}
                    className={`p-4 md:p-5 rounded-xl md:rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${isSelected
                      ? 'bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-500 ring-2 ring-cyan-500/20 md:ring-4 shadow-xl'
                      : isInMatch
                      ? 'bg-slate-900/60 border-amber-900/60 text-slate-300 hover:border-amber-700'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-[10px] md:text-xs font-black px-2 md:px-2.5 py-1 rounded-xl bg-slate-950 text-cyan-400 border border-slate-800">
                        MEJA #{table.tableNumber}
                      </span>
                      {isInMatch ? (
                        <span className="px-1.5 md:px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[9px] md:text-[10px] font-bold">
                          IN MATCH
                        </span>
                      ) : (
                        <span className="px-1.5 md:px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] md:text-[10px] font-bold">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    <div className="text-sm md:text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                      {table.tableName || `Meja 0${table.tableNumber}`}
                    </div>
                    <div className="text-[10px] md:text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" /> PIN Ref: ****
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Touch PIN Numpad */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl md:rounded-3xl p-4 md:p-6 shadow-2xl space-y-4 md:space-y-5 font-mono">
          <div>
            <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
              2. Masukkan PIN Wasit Meja
            </h2>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">
              {selectedTable ? `Otorisasi untuk ${selectedTable.tableName}` : 'Pilih meja di sebelah kiri terlebih dahulu'}
            </p>
          </div>

          {/* PIN Indicator Dots */}
          <div
            className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-950 border flex items-center justify-center gap-3 md:gap-4 transition-all ${pinError ? 'border-rose-500 bg-rose-950/30 animate-shake' : 'border-slate-800'}`}
          >
            {[0, 1, 2, 3].map((idx) => {
              const hasDigit = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-2 transition-all ${hasDigit ? 'bg-cyan-400 border-cyan-400 shadow-md shadow-cyan-500/50 scale-110' : 'border-slate-700 bg-slate-900'}`}
                />
              );
            })}
          </div>

          {pinError && (
            <div className="text-center text-[10px] md:text-xs font-bold text-rose-400 font-mono animate-bounce px-1">
              âœ• {pinError}
            </div>
          )}

          {/* Large Touch-Friendly 3x4 Numpad */}
          <div className="grid grid-cols-3 gap-2 md:gap-2.5 font-mono">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'DEL'].map((btn) => {
              const isActionBtn = btn === 'CLEAR' || btn === 'DEL';
              return (
                <button
                  key={btn}
                  disabled={!selectedTable || isVerifying}
                  onClick={() => handleNumpadPress(btn)}
                  className={`h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-base md:text-lg transition-all flex items-center justify-center disabled:opacity-30 ${isActionBtn ? 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-[10px] md:text-xs' : 'bg-slate-950 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-700 text-white text-xl md:text-2xl active:scale-95 shadow-md'}`}
                >
                  {btn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 font-mono border-t border-slate-900 pt-4">
        SIREDOM v2.0 Sistem Rekapitulasi Domino
      </div>
    </div>
  );
}