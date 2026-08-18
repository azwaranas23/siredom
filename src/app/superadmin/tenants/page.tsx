'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { TenantMaster } from '@/types/domino';
import { Building2, Plus, CreditCard, Pencil, Trash2, Key, Copy, Check, X, Shield, Lock, Mail } from 'lucide-react';

export default function SuperAdminTenantsPage() {
  const { tenants, masterTables, addTenant, updateTenant, deleteTenant, toggleTenantStatus } = useScorerStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantMaster | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewCredentialTenant, setViewCredentialTenant] = useState<TenantMaster | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form states for Create
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('');
  const [newPlan, setNewPlan] = useState<'basic' | 'pro' | 'enterprise'>('pro');
  const [newMaxTables, setNewMaxTables] = useState<number>(10);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('password123');

  // Form states for Edit
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPlan, setEditPlan] = useState<'basic' | 'pro' | 'enterprise'>('pro');
  const [editMaxTables, setEditMaxTables] = useState<number>(10);
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('password123');

  const handleOpenEdit = (t: TenantMaster) => {
    setEditingTenant(t);
    setEditName(t.name);
    setEditCode(t.code);
    setEditPlan(t.subscriptionPlan);
    setEditMaxTables(t.maxTables);
    setEditAdminEmail(t.adminEmail || `admin@${t.code.toLowerCase()}.com`);
    setEditAdminPassword(t.adminPassword || 'password123');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantCode) return;

    const formattedCode = newTenantCode.trim().toUpperCase();

    addTenant({
      name: newTenantName.trim(),
      code: formattedCode,
      subscriptionPlan: newPlan,
      status: 'active',
      maxTables: newMaxTables,
      adminEmail: newAdminEmail.trim() || `admin@${formattedCode.toLowerCase()}.com`,
      adminPassword: newAdminPassword.trim() || 'password123',
    });

    setNewTenantName('');
    setNewTenantCode('');
    setNewAdminEmail('');
    setNewAdminPassword('password123');
    setIsCreateModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editName || !editCode) return;

    updateTenant(editingTenant.id, {
      name: editName.trim(),
      code: editCode.trim().toUpperCase(),
      subscriptionPlan: editPlan,
      maxTables: editMaxTables,
      adminEmail: editAdminEmail.trim(),
      adminPassword: editAdminPassword.trim(),
    });

    setEditingTenant(null);
  };

  const handleDeleteConfirm = (tenantId: string) => {
    deleteTenant(tenantId);
    setDeleteConfirmId(null);
  };

  const handleCopyCredentials = (t: TenantMaster) => {
    const defaultPin = masterTables[0]?.pinCode || '1234';
    const textToCopy = `====================================
SIREDOM PORTAL LOGIN KREDENSIAL
====================================
Mitra Tenant: ${t.name}
Kode Tenant: ${t.code}
Status Akun: ${t.status.toUpperCase()}
Paket Billing: ${t.subscriptionPlan.toUpperCase()}

[AKUN CAFE ADMIN]
Email: ${t.adminEmail}
Password: ${t.adminPassword}

[AKUN WASIT MEJA]
Kode Tenant: ${t.code}
PIN Meja Utama: ${defaultPin}
URL Login Portal: http://localhost:3000/login
====================================`;

    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <Building2 className="w-6 h-6 text-rose-400" />
            Manajemen Tenant Warkop & Kredensial Admin (Super Admin)
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Buat Akun Admin Cafe, Atur Email/Password, Salin Kredensial, & Kelola Suspension SaaS
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> REGISTRASI TENANT & AKUN ADMIN BARU
        </button>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="p-4">Nama Tenant Warkop</th>
                <th className="p-4">Kode Tenant</th>
                <th className="p-4">Akun Email Admin</th>
                <th className="p-4">Paket Billing</th>
                <th className="p-4">Kuota Meja</th>
                <th className="p-4">Status Akun</th>
                <th className="p-4 text-right">Aksi Governance & Kredensial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-extrabold text-white">{t.name}</td>
                  <td className="p-4 font-bold text-cyan-400">{t.code}</td>
                  <td className="p-4 font-bold text-slate-300 flex items-center gap-1.5 pt-4">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.adminEmail || `admin@${t.code.toLowerCase()}.com`}</span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border uppercase text-[10px] font-bold ${
                        t.subscriptionPlan === 'enterprise'
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : t.subscriptionPlan === 'pro'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <CreditCard className="w-3 h-3" /> {t.subscriptionPlan}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-300">{t.maxTables} Meja</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status === 'active'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                      }`}
                    >
                      {t.status === 'active' ? '● AKTIF' : '⛔ SUSPENDED'}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    {/* View/Copy Credential Button */}
                    <button
                      onClick={() => setViewCredentialTenant(t)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-300 text-xs font-extrabold flex items-center gap-1 transition-colors"
                      title="Lihat & Salin Kredensial Login Admin"
                    >
                      <Key className="w-3.5 h-3.5" /> Kredensial
                    </button>

                    {/* Edit Tenant Button */}
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors"
                      title="Edit Data Tenant"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Tenant Button */}
                    <button
                      onClick={() => setDeleteConfirmId(t.id)}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                      title="Hapus Tenant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Suspend / Activate Toggle Button */}
                    <button
                      onClick={() => toggleTenantStatus(t.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        t.status === 'active'
                          ? 'bg-rose-950 hover:bg-rose-900 border-rose-800 text-rose-300'
                          : 'bg-emerald-950 hover:bg-emerald-900 border-emerald-800 text-emerald-300'
                      }`}
                    >
                      {t.status === 'active' ? 'Suspend' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New Tenant & Admin Account Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
                <Building2 className="w-5 h-5 text-rose-400" />
                Registrasi Tenant & Akun Admin Baru
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">NAMA WARKOP / CAFE</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-rose-500"
                  placeholder="Tab Slowbar Coffee"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">KODE TENANT UNIQUE</label>
                <input
                  type="text"
                  value={newTenantCode}
                  onChange={(e) => setNewTenantCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold uppercase focus:outline-none focus:border-rose-500"
                  placeholder="TAB-SLOWBAR"
                  required
                />
              </div>

              {/* Admin Email & Password Configuration */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-3">
                <span className="text-[10px] text-rose-400 uppercase font-bold block flex items-center gap-1">
                  <Shield className="w-3 h-3" /> SETTING AKUN CAFE ADMIN:
                </span>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">EMAIL ADMIN CAFE</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-rose-500"
                    placeholder="admin@slowbar.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">PASSWORD ADMIN CAFE</label>
                  <input
                    type="text"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-cyan-300 font-bold focus:outline-none focus:border-rose-500"
                    placeholder="password123"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">PAKET BILLING</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-rose-500"
                  >
                    <option value="basic">Basic (5 Meja)</option>
                    <option value="pro">Pro (10 Meja)</option>
                    <option value="enterprise">Enterprise (25 Meja)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">KUOTA MEJA</label>
                  <input
                    type="number"
                    value={newMaxTables}
                    onChange={(e) => setNewMaxTables(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-rose-500"
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20"
                >
                  Simpan Tenant & Akun Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant & Admin Account Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
                <Pencil className="w-5 h-5 text-cyan-400" />
                Edit Tenant & Akun Admin: {editingTenant.name}
              </h3>
              <button onClick={() => setEditingTenant(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">NAMA WARKOP / CAFE</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">KODE TENANT UNIQUE</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold uppercase focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Admin Email & Password Configuration */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-3">
                <span className="text-[10px] text-cyan-400 uppercase font-bold block flex items-center gap-1">
                  <Shield className="w-3 h-3" /> SETTING AKUN CAFE ADMIN:
                </span>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">EMAIL ADMIN CAFE</label>
                  <input
                    type="email"
                    value={editAdminEmail}
                    onChange={(e) => setEditAdminEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">PASSWORD ADMIN CAFE</label>
                  <input
                    type="text"
                    value={editAdminPassword}
                    onChange={(e) => setEditAdminPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">PAKET BILLING</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="basic">Basic (5 Meja)</option>
                    <option value="pro">Pro (10 Meja)</option>
                    <option value="enterprise">Enterprise (25 Meja)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">KUOTA MEJA</label>
                  <input
                    type="number"
                    value={editMaxTables}
                    onChange={(e) => setEditMaxTables(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-600/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Copy Credential Modal */}
      {viewCredentialTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Kredensial Akses Admin: {viewCredentialTenant.name}
              </h3>
              <button onClick={() => setViewCredentialTenant(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">NAMA TENANT / WARKOP</span>
                <span className="text-sm font-extrabold text-white">{viewCredentialTenant.name} ({viewCredentialTenant.code})</span>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-amber-400 uppercase block font-bold mb-1">🔑 LOGIN AKUN CAFE ADMIN:</span>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div>Email: <strong className="text-cyan-300">{viewCredentialTenant.adminEmail}</strong></div>
                  <div>Password: <strong className="text-emerald-400">{viewCredentialTenant.adminPassword}</strong></div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-blue-400 uppercase block font-bold mb-1">🎲 LOGIN WASIT MEJA:</span>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div>Kode Tenant: <strong className="text-white">{viewCredentialTenant.code}</strong></div>
                  <div>PIN Meja Utama: <strong className="text-cyan-300">{masterTables[0]?.pinCode || '1234'}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setViewCredentialTenant(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Tutup
              </button>
              <button
                onClick={() => handleCopyCredentials(viewCredentialTenant)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'TER-SALIN KREDENSIAL!' : 'SALIN TEKS KREDENSIAL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center space-y-4 font-sans">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto text-2xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-xl font-extrabold text-white">Hapus Tenant Ini?</h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Tenant ini akan dihapus secara permanen dari sistem SaaS SIREDOM.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteConfirm(deleteConfirmId)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all"
              >
                Ya, Hapus Tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
