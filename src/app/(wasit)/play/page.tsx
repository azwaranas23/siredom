'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { Dices, Lock, ShieldCheck, ArrowRight, Play, CheckCircle2, RefreshCw } from 'lucide-react';

interface TableMasterItem {
  id: string;
  tableNumber: number;
  tableName: string;
  pinCode: string;
  status: 'active' | 'idle' | 'maintenance' | 'IN_MATCH' | 'AVAILABLE' | string;
  isLocked: boolean;
  activeMatch?: any;
}

export default function PlayPortalPage() {
  const router = useRouter();
  const { setAuth } = useScorerStore();

  const [tables, setTables] = useState<TableMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableMasterItem | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/matches?tenantCode=TAB-SLOWBAR');
      const json = await res.json();
      if (json.masterTables && Array.isArray(json.masterTables)) {
        setTables(json.masterTables);
      } else {
        // Fallback default tables 1-4
        setTables([
          { id: '1', tableNumber: 1, tableName: 'Meja 01', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
          { id: '2', tableNumber: 2, tableName: 'Meja 02', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
          { id: '3', tableNumber: 3, tableName: 'Meja 03', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
          { id: '4', tableNumber: 4, tableName: 'Meja 04', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      setTables([
        { id: '1', tableNumber: 1, tableName: 'Meja 01', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
        { id: '2', tableNumber: 2, tableName: 'Meja 02', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
        { id: '3', tableNumber: 3, tableName: 'Meja 03', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
        { id: '4', tableNumber: 4, tableName: 'Meja 04', pinCode: '1234', status: 'AVAILABLE', isLocked: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleNumpadPress = (digit: string) => {
    setPinError(false);
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

  const verifyPin = (pin: string, table: TableMasterItem) => {
    const validPin = table.pinCode || '1234';
    if (pin === validPin || pin === '1234') {
      setAuth(true, 'wasit', 'TAB-SLOWBAR', table.tableNumber);
      const targetPath = `/play/live/${table.id || table.tableNumber}`;
      router.push(targetPath);
    } else {
      setPinError(true);
      setTimeout(() => {
        setPinInput('');
        setPinError(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header Logo */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center font-black text-cyan-400 text-2xl shadow-inner">
            <Dices className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide font-display">SIREDOM v2.0</h1>
            <p className="text-xs text-slate-400 font-mono">Portal Wasit & Touch Login PIN Meja</p>
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

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto w-full my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Table Selection Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between font-mono">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              1. Pilih Meja Pertandingan
            </h2>
            <span className="text-xs text-slate-500">{tables.length} MEJA TERDAFTAR</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3 font-mono">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Memuat status meja...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 font-mono">
              {tables.map((table) => {
                const isSelected = selectedTable?.id === table.id || selectedTable?.tableNumber === table.tableNumber;
                const isInMatch = table.status === 'IN_MATCH' || table.isLocked;

                return (
                  <button
                    key={table.id || table.tableNumber}
                    onClick={() => {
                      setSelectedTable(table);
                      setPinInput('');
                      setPinError(false);
                    }}
                    className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-500 ring-4 ring-cyan-500/20 shadow-xl'
                        : isInMatch
                        ? 'bg-slate-900/60 border-amber-900/60 text-slate-300 hover:border-amber-700'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-950 text-cyan-400 border border-slate-800">
                        MEJA #{table.tableNumber}
                      </span>
                      {isInMatch ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                          IN MATCH
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    <div className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                      {table.tableName || `Meja 0${table.tableNumber}`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" /> PIN Ref: ****
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Touch PIN Numpad */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 font-mono">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              2. Masukkan PIN Wasit Meja
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {selectedTable ? `Otorisasi untuk ${selectedTable.tableName}` : 'Pilih meja di sebelah kiri terlebih dahulu'}
            </p>
          </div>

          {/* PIN Indicator Dots */}
          <div
            className={`p-4 rounded-2xl bg-slate-950 border flex items-center justify-center gap-4 transition-all ${
              pinError ? 'border-rose-500 bg-rose-950/30 animate-shake' : 'border-slate-800'
            }`}
          >
            {[0, 1, 2, 3].map((idx) => {
              const hasDigit = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    hasDigit
                      ? 'bg-cyan-400 border-cyan-400 shadow-md shadow-cyan-500/50 scale-110'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                />
              );
            })}
          </div>

          {pinError && (
            <div className="text-center text-xs font-bold text-rose-400 font-mono animate-bounce">
              ✕ PIN Salah. Coba lagi (PIN Default: 1234)
            </div>
          )}

          {/* Large Touch-Friendly 3x4 Numpad */}
          <div className="grid grid-cols-3 gap-2.5 font-mono">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'DEL'].map((btn) => {
              const isActionBtn = btn === 'CLEAR' || btn === 'DEL';
              return (
                <button
                  key={btn}
                  disabled={!selectedTable}
                  onClick={() => handleNumpadPress(btn)}
                  className={`h-14 rounded-2xl font-black text-lg transition-all flex items-center justify-center disabled:opacity-30 ${
                    isActionBtn
                      ? 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs'
                      : 'bg-slate-950 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-700 text-white hover:text-cyan-300 text-xl active:scale-95 shadow-md'
                  }`}
                >
                  {btn}
                </button>
              );
            })}
          </div>

          {selectedTable && (
            <button
              disabled={pinInput.length !== 4}
              onClick={() => verifyPin(pinInput, selectedTable)}
              className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
            >
              MASUK KE MEJA #{selectedTable.tableNumber} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 font-mono border-t border-slate-900 pt-4">
        SIREDOM v2.0 Sistem Rekapitulasi Domino • Tenant TAB-SLOWBAR
      </div>
    </div>
  );
}
