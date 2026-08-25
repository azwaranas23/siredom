'use server';

import { prisma } from '@/lib/prisma';
import { issueSessionCookie } from '@/app/actions/authActions';
import { revalidatePath } from 'next/cache';

const PLAN_MAX_TABLES: Record<string, number> = {
  basic: 5,
  pro: 10,
  enterprise: 25,
};

export interface VerifyTablePinResult {
  success: boolean;
  error?: string;
  role?: 'wasit';
  tenantCode?: string;
  tableNumber?: number;
  tableId?: string;
  hasActiveMatch?: boolean;
  lockedByOtherDevice?: boolean;
}

export interface ReleaseTableSessionResult {
  status: 'success' | 'error';
  message?: string;
}

/**
 * Melepas kunci sesi meja saat wasit logout (Ticket GH #1).
 * Hanya perangkat PEMILIK kunci (activeDeviceId cocok) yang boleh melepas —
 * mencegah perangkat lain membajak lewat endpoint ini.
 * Identifikasi meja: tableId langsung, atau fallback tenantCode + tableNumber.
 * Sengaja TIDAK menyentuh cookies() agar tetap bisa diuji di luar runtime Next.
 */
export async function releaseTableSessionAction(input: {
  tableId?: string;
  tenantCode?: string;
  tableNumber?: number;
  deviceId: string;
}): Promise<ReleaseTableSessionResult> {
  try {
    const deviceId = String(input.deviceId || '').trim();
    if (!deviceId || (!input.tableId && !(input.tenantCode && input.tableNumber))) {
      return { status: 'error', message: 'deviceId dan (tableId | tenantCode+tableNumber) wajib diisi' };
    }

    // Resolusi meja + tenantId (AGENTS.md §1.5: setiap query Prisma wajib scoping tenant)
    const table = await prisma.tableMaster.findFirst({
      where: input.tableId
        ? { id: input.tableId }
        : {
            tableNumber: Number(input.tableNumber),
            tenant: { code: String(input.tenantCode).trim().toUpperCase() },
          },
      select: { id: true, tenantId: true },
    });
    if (!table) return { status: 'error', message: 'Meja tidak ditemukan' };

    const released = await prisma.tableMaster.updateMany({
      where: {
        id: table.id,
        tenantId: table.tenantId,
        isLocked: true,
        activeDeviceId: deviceId,
      },
      data: {
        isLocked: false,
        activeDeviceId: null,
        status: 'active',
      },
    });

    if (released.count === 0) {
      return { status: 'error', message: 'Sesi lock bukan milik perangkat ini atau meja tidak terkunci' };
    }

    return { status: 'success' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal melepas sesi meja';
    console.error('releaseTableSessionAction Error:', error);
    return { status: 'error', message };
  }
}

/**
 * Verifikasi PIN meja secara server-side (tanpa membocorkan pinCode ke klien),
 * lalu mengklaim session lock secara ATOMIK untuk satu perangkat.
 * Dua perangkat yang memasukkan PIN sama bersamaan → hanya satu yang menang.
 */
export async function verifyTablePinAction(input: {
  tenantCode: string;
  tableNumber: number;
  pin: string;
  deviceId: string;
}): Promise<VerifyTablePinResult> {
  try {
    const code = String(input.tenantCode || '').trim().toUpperCase();
    const pin = String(input.pin || '').trim();
    const deviceId = String(input.deviceId || '').trim();

    if (!code || !pin || !deviceId) {
      return { success: false, error: 'Kode Penyelenggara, Nomor Meja, PIN, dan ID Perangkat wajib diisi' };
    }

    // Atomic claim: update hanya terjadi jika meja belum terkunci ATAU
    // sudah terkunci oleh perangkat yang sama (re-claim).
    const claim = await prisma.tableMaster.updateMany({
      where: {
        tableNumber: input.tableNumber,
        pinCode: pin,
        tenant: { code: code },
        OR: [{ isLocked: false }, { activeDeviceId: deviceId }],
      },
      data: {
        isLocked: true,
        activeDeviceId: deviceId,
        status: 'IN_MATCH',
      },
    });

    if (claim.count === 0) {
      // Bedakan antara PIN salah vs meja dikuasai perangkat lain.
      const table = await prisma.tableMaster.findFirst({
        where: { tableNumber: input.tableNumber, tenant: { code } },
        select: { id: true, isLocked: true, activeDeviceId: true },
      });

      if (!table) {
        return { success: false, error: `Meja #${input.tableNumber} tidak ditemukan untuk penyelenggara ${code}` };
      }

      if (table.isLocked && table.activeDeviceId && table.activeDeviceId !== deviceId) {
        return {
          success: false,
          error: 'Meja sedang digunakan oleh perangkat lain. Minta panitia melepas sesi terlebih dahulu.',
          lockedByOtherDevice: true,
        };
      }

      return { success: false, error: 'PIN Meja salah. Coba lagi.' };
    }

    const claimedTable = await prisma.tableMaster.findFirst({
      where: { tableNumber: input.tableNumber, tenant: { code } },
      include: { tenant: true },
    });

    if (!claimedTable?.tenant?.code) {
      return { success: false, error: 'Meja ini belum terhubung ke penyelenggara mana pun' };
    }

    await issueSessionCookie({
      role: 'wasit',
      tenantCode: claimedTable.tenant.code,
      tableNumber: claimedTable.tableNumber,
    });

    // Deteksi apakah sesi pertandingan aktif sudah ada (untuk routing setup/live)
    const activeMatch = await prisma.matchSession.findFirst({
      where: { tableId: claimedTable.id, status: 'IN_PROGRESS' },
      select: { id: true },
    });

    return {
      success: true,
      role: 'wasit' as const,
      tenantCode: claimedTable.tenant.code,
      tableNumber: claimedTable.tableNumber,
      tableId: claimedTable.id,
      hasActiveMatch: Boolean(activeMatch),
    };
  } catch (error: any) {
    console.error('verifyTablePinAction Error:', error);
    return { success: false, error: error.message || 'Gagal verifikasi PIN meja' };
  }
}

/**
 * Fetch master tables for a specific tenant by tenantCode from Supabase PostgreSQL via Prisma
 */
export async function getTablesByTenant(tenantCode: string) {
  try {
    const codeToUse = String(tenantCode || '').trim().toUpperCase();

    if (!codeToUse) {
      return { success: false, error: 'Kode Tenant wajib diisi', data: [] };
    }

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
    const codeToUse = String(tenantCode || '').trim().toUpperCase();

    if (!codeToUse) {
      return { success: false, error: 'Kode Tenant wajib diisi' };
    }

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
    const name = tableName || `Meja ${nextTableNum}`;

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
