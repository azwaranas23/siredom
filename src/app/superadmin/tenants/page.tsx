'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Building2, Plus, Search, ShieldAlert, CheckCircle2, RefreshCw, KeyRound, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import {
  getTenantsAction,
  createTenantAction,
  updateTenantAction,
  deleteTenantAction,
} from '@/app/actions/tenantActions';

interface TenantItem {
  id: string;
  name: string;
  code: string;
  subscriptionPlan: string;
  status: 'active' | 'suspended';
  maxTables: number;
  activeMatches: number;
  adminEmail: string;
  createdAt: string;
}

const PLAN_MAX_TABLES: Record<string, number> = {
  basic: 5,
  pro: 10,
  enterprise: 25,
};

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<TenantItem | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subscriptionPlan: 'pro',
    adminEmail: '',
    adminPassword: '',
  });

  const [formError, setFormError] = useState('');

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await getTenantsAction();
      if (res.success) {
        setTenants(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      subscriptionPlan: 'pro',
      adminEmail: '',
      adminPassword: '',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (tenant: TenantItem) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      code: tenant.code,
      subscriptionPlan: tenant.subscriptionPlan,
      adminEmail: tenant.adminEmail,
      adminPassword: '',
    });
    setFormError('');
  };

  const handleCreateTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.code || !formData.adminEmail || !formData.adminPassword) {
      setFormError('Nama Tenant, Kode Tenant, Email Admin, dan Password wajib diisi');
      return;
    }

    startTransition(async () => {
      const res = await createTenantAction({
        name: formData.name,
        code: formData.code,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        subscriptionPlan: formData.subscriptionPlan,
        maxTables: PLAN_MAX_TABLES[formData.subscriptionPlan] || 10,
      });

      if (res.success) {
        await fetchTenants();
        setIsCreateModalOpen(false);
      } else {
        setFormError(res.error || 'Gagal membuat tenant baru');
      }
    });
  };

  const handleUpdateTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setFormError('');

    startTransition(async () => {
      const res = await updateTenantAction({
        id: editingTenant.id,
        name: formData.name,
        subscriptionPlan: formData.subscriptionPlan,
        adminEmail: formData.adminEmail,
        maxTables: PLAN_MAX_TABLES[formData.subscriptionPlan] || 10,
      });

      if (res.success) {
        await fetchTenants();
        setEditingTenant(null);
      } else {
        setFormError(res.error || 'Gagal mengupdate tenant');
      }
    });
  };

  const handleToggleTenantStatus = (tenant: TenantItem) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    startTransition(async () => {
      const res = await updateTenantAction({
        id: tenant.id,
        status: newStatus,
      });
      if (res.success) {
        await fetchTenants();
      }
    });
  };

  const handleDeleteTenantConfirm = (tenant: TenantItem) => {
    startTransition(async () => {
      const res = await deleteTenantAction(tenant.id);
      if (res.success) {
        await fetchTenants();
        setDeleteConfirmTenant(null);
      } else {
        alert(res.error || 'Gagal menghapus tenant');
      }
    });
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <Building2 className="w-6 h-6 text-rose-400" />
            Superadmin SaaS Tenant Management
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Kelola Mitra Cafe / Warkop, Akun Admin (Bcrypt Hashed), & Limit Kuota Paket Billing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTenants}
            disabled={isLoading || isPending}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh Tenant dari Database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isPending ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> REGISTRASI TENANT BARU
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Cari berdasarkan Nama Cafe, Kode Tenant, atau Email Admin..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-white text-sm focus:outline-none w-full font-mono placeholder:text-slate-600"
        />
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden font-mono">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
              <tr>
                <th className="px-6 py-4">MITRA CAFE / WARKOP</th>
                <th className="px-6 py-4">KODE TENANT</th>
                <th className="px-6 py-4">EMAIL ADMIN (BCRYPT)</th>
                <th className="px-6 py-4">PAKET BILLING</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-bold">
                    Memuat data tenant dari Supabase PostgreSQL via Server Action...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-bold">
                    Tidak ada data tenant ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const maxQuota = PLAN_MAX_TABLES[t.subscriptionPlan] || t.maxTables;

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-rose-400" />
                        {t.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-cyan-400">{t.code}</td>
                      <td className="px-6 py-4 text-slate-300">{t.adminEmail}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-400 font-extrabold uppercase border border-slate-800">
                          {t.subscriptionPlan} ({maxQuota} Meja)
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            t.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}
                        >
                          {t.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> AKTIF
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 text-rose-400" /> SUSPENDED
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleTenantStatus(t)}
                          disabled={isPending}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-[10px] transition-all border ${
                            t.status === 'active'
                              ? 'bg-amber-950 hover:bg-amber-900 text-amber-400 border-amber-800'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border-emerald-800'
                          }`}
                        >
                          {t.status === 'active' ? 'SUSPEND' : 'AKTIFKAN'}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                          title="Edit Tenant"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTenant(t)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                          title="Hapus Tenant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Tenant Modal */}
      {(isCreateModalOpen || editingTenant) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-rose-400" />
                {editingTenant ? 'Edit Data Tenant' : 'Registrasi Tenant Cafe Baru'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingTenant(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
                ⚠️ {formError}
              </div>
            )}

            <form
              onSubmit={editingTenant ? handleUpdateTenantSubmit : handleCreateTenantSubmit}
              className="space-y-4 font-mono text-xs"
            >
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">Nama Cafe / Warkop</label>
                <input
                  type="text"
                  placeholder="Misal: Tab Slowbar Coffee"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">Kode Tenant (Unik)</label>
                <input
                  type="text"
                  placeholder="Misal: TAB-SLOWBAR"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!!editingTenant}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 uppercase disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">Paket Billing SaaS</label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="basic">Paket Basic (Kuota Max 5 Meja)</option>
                  <option value="pro">Paket Pro (Kuota Max 10 Meja)</option>
                  <option value="enterprise">Paket Enterprise (Kuota Max 25 Meja)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">Email Admin Cafe</label>
                <input
                  type="email"
                  placeholder="admin@tabslowbar.com"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {!editingTenant && (
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase">
                    Password Admin (Di-encrypt Bcrypt)
                  </label>
                  <input
                    type="password"
                    placeholder="Masukkan password admin..."
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingTenant(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold shadow-lg shadow-rose-600/30 disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : editingTenant ? 'Simpan Perubahan' : 'Buat Tenant & Akun User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Tenant Modal */}
      {deleteConfirmTenant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto text-2xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-xl font-extrabold text-white">Hapus Tenant {deleteConfirmTenant.name}?</h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Seluruh data meja master, akun admin, dan sesi pertandingan tenant ini akan dihapus secara permanen dari Supabase PostgreSQL.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTenant(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteTenantConfirm(deleteConfirmTenant)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isPending ? 'Hapus...' : 'Ya, Hapus Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
