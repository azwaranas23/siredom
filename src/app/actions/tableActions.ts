'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const PLAN_MAX_TABLES: Record<string, number> = {
  basic: 5,
  pro: 10,
  enterprise: 25,
};

/**
 * Fetch master tables for a specific tenant by tenantCode from Supabase PostgreSQL via Prisma
 */
export async function getTablesByTenant(tenantCode: string) {
  try {
    const codeToUse = (tenantCode || 'TAB-SLOWBAR').trim().toUpperCase();

    const tenant = await prisma.tenant.findUnique({
      where: { code: codeToUse },
      include: {
        tableMasters: {
          orderBy: { tableNumber: 'asc' },
        },
      },
    });

    if (!tenant) {
      return { success: false, error: 'Tenant tidak ditemukan', data: [] };
    }

    const formattedTables = tenant.tableMasters.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      tableNumber: t.tableNumber,
      tableName: t.tableName,
      pinCode: t.pinCode,
      status: t.status as 'active' | 'idle' | 'maintenance',
    }));

    return {
      success: true,
      data: formattedTables,
      tenantInfo: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        subscriptionPlan: tenant.subscriptionPlan,
        maxTables: PLAN_MAX_TABLES[tenant.subscriptionPlan] || tenant.maxTables || 10,
      },
    };
  } catch (error: any) {
    console.error('getTablesByTenant Error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data meja', data: [] };
  }
}

/**
 * Create a new master table for a tenant with 4-digit random PIN and quota validation
 */
export async function createTable(tenantCode: string, tableName?: string) {
  try {
    const codeToUse = (tenantCode || 'TAB-SLOWBAR').trim().toUpperCase();

    const tenant = await prisma.tenant.findUnique({
      where: { code: codeToUse },
      include: {
        tableMasters: true,
      },
    });

    if (!tenant) {
      return { success: false, error: 'Tenant tidak ditemukan' };
    }

    const maxQuota = PLAN_MAX_TABLES[tenant.subscriptionPlan] || tenant.maxTables || 10;
    if (tenant.tableMasters.length >= maxQuota) {
      return {
        success: false,
        error: `Batas Kuota Meja Tercapai! Paket ${tenant.subscriptionPlan.toUpperCase()} membatasi maksimal ${maxQuota} meja.`,
        isQuotaExceeded: true,
        maxQuota,
      };
    }

    const nextTableNum = tenant.tableMasters.reduce((max, t) => Math.max(max, t.tableNumber), 0) + 1;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const name = tableName || `Meja ${nextTableNum <= 2 ? 'Reguler' : 'VIP'} ${nextTableNum < 10 ? '0' + nextTableNum : nextTableNum}`;

    const newTable = await prisma.tableMaster.create({
      data: {
        tenantId: tenant.id,
        tableNumber: nextTableNum,
        tableName: name,
        pinCode: pin,
        status: 'active',
      },
    });

    revalidatePath('/admin/dashboard');

    return {
      success: true,
      data: {
        id: newTable.id,
        tenantId: newTable.tenantId,
        tableNumber: newTable.tableNumber,
        tableName: newTable.tableName,
        pinCode: newTable.pinCode,
        status: newTable.status as any,
      },
    };
  } catch (error: any) {
    console.error('createTable Error:', error);
    return { success: false, error: error.message || 'Gagal membuat meja baru' };
  }
}

/**
 * Update the table name of a TableMaster record
 */
export async function updateTableName(tableId: string, name: string) {
  try {
    if (!tableId || !name.trim()) {
      return { success: false, error: 'ID Meja dan nama baru wajib diisi' };
    }

    const updatedTable = await prisma.tableMaster.update({
      where: { id: tableId },
      data: {
        tableName: name.trim(),
      },
    });

    revalidatePath('/admin/dashboard');

    return {
      success: true,
      data: {
        id: updatedTable.id,
        tenantId: updatedTable.tenantId,
        tableNumber: updatedTable.tableNumber,
        tableName: updatedTable.tableName,
        pinCode: updatedTable.pinCode,
        status: updatedTable.status as any,
      },
    };
  } catch (error: any) {
    console.error('updateTableName Error:', error);
    return { success: false, error: error.message || 'Gagal mengubah nama meja' };
  }
}

/**
 * Update/Regenerate the 4-digit PIN code of a TableMaster record
 */
export async function updateTablePin(tableId: string, pin?: string) {
  try {
    if (!tableId) {
      return { success: false, error: 'ID Meja wajib diisi' };
    }

    const pinToUse = pin || Math.floor(1000 + Math.random() * 9000).toString();

    const updatedTable = await prisma.tableMaster.update({
      where: { id: tableId },
      data: {
        pinCode: pinToUse,
      },
    });

    revalidatePath('/admin/dashboard');

    return {
      success: true,
      data: {
        id: updatedTable.id,
        tenantId: updatedTable.tenantId,
        tableNumber: updatedTable.tableNumber,
        tableName: updatedTable.tableName,
        pinCode: updatedTable.pinCode,
        status: updatedTable.status as any,
      },
    };
  } catch (error: any) {
    console.error('updateTablePin Error:', error);
    return { success: false, error: error.message || 'Gagal mengupdate PIN meja' };
  }
}

/**
 * Delete a TableMaster record by ID
 */
export async function deleteTable(tableId: string) {
  try {
    if (!tableId) {
      return { success: false, error: 'ID Meja wajib diisi' };
    }

    await prisma.tableMaster.delete({
      where: { id: tableId },
    });

    revalidatePath('/admin/dashboard');

    return { success: true, message: 'Meja berhasil dihapus' };
  } catch (error: any) {
    console.error('deleteTable Error:', error);
    return { success: false, error: error.message || 'Gagal menghapus meja' };
  }
}
