'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export interface CreateTenantInput {
  name: string;
  code: string;
  adminEmail: string;
  adminPassword: string;
  subscriptionPlan?: string;
  maxTables?: number;
}

export interface UpdateTenantInput {
  id: string;
  name?: string;
  subscriptionPlan?: string;
  status?: 'active' | 'suspended';
  maxTables?: number;
  adminEmail?: string;
}

const PLAN_MAX_TABLES: Record<string, number> = {
  basic: 5,
  pro: 10,
  enterprise: 25,
};

/**
 * Create a new Tenant and its Cafe Admin User in a single Prisma transaction.
 * Passwords are encrypted with bcryptjs (10 salt rounds).
 */
export async function createTenantAction(input: CreateTenantInput) {
  try {
    const { name, code, adminEmail, adminPassword, subscriptionPlan = 'pro', maxTables } = input;

    if (!name || !code || !adminEmail || !adminPassword) {
      return { success: false, error: 'Nama Tenant, Kode, Email Admin, dan Password wajib diisi' };
    }

    const uppercaseCode = code.trim().toUpperCase();
    const normalizedEmail = adminEmail.trim().toLowerCase();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const calculatedMaxTables = maxTables || PLAN_MAX_TABLES[subscriptionPlan.toLowerCase()] || 10;

    // Check if code or email already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ code: uppercaseCode }, { adminEmail: normalizedEmail }],
      },
    });

    if (existingTenant) {
      return { success: false, error: 'Kode Tenant atau Email Admin sudah terdaftar di sistem' };
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Execute Prisma Transaction: Create Tenant + Cafe Admin User + Meja #1
    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: name.trim(),
          slug,
          code: uppercaseCode,
          adminEmail: normalizedEmail,
          adminPasswordHash: passwordHash,
          subscriptionPlan: subscriptionPlan.toLowerCase(),
          maxTables: calculatedMaxTables,
          status: 'active',
        },
      });

      // Create Cafe Admin User in User table
      await tx.user.create({
        data: {
          tenantId: newTenant.id,
          name: `Admin ${name.trim()}`,
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN',
        },
      });

      // Create Initial Master Table #1 (PIN acak, bukan default)
      await tx.tableMaster.create({
        data: {
          tenantId: newTenant.id,
          tableNumber: 1,
          tableName: 'Meja Utama 01',
          pinCode: Math.floor(1000 + Math.random() * 9000).toString(),
          status: 'active',
        },
      });

      return newTenant;
    });

    revalidatePath('/superadmin/tenants');

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        code: result.code,
        subscriptionPlan: result.subscriptionPlan,
        status: result.status,
        maxTables: result.maxTables,
        adminEmail: result.adminEmail,
      },
    };
  } catch (error: any) {
    console.error('createTenantAction Error:', error);
    return { success: false, error: error.message || 'Gagal membuat tenant baru' };
  }
}

/**
 * Fetch all Tenants with active match session count
 */
export async function getTenantsAction() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        tableMasters: true,
        matchSessions: {
          where: { status: 'IN_PROGRESS' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTenants = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      subscriptionPlan: t.subscriptionPlan,
      status: t.status as 'active' | 'suspended',
      maxTables: PLAN_MAX_TABLES[t.subscriptionPlan] || t.maxTables || 10,
      activeMatches: t.matchSessions.length,
      adminEmail: t.adminEmail,
      createdAt: t.createdAt.toISOString(),
    }));

    return { success: true, data: formattedTenants };
  } catch (error: any) {
    console.error('getTenantsAction Error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data tenant', data: [] };
  }
}

/**
 * Update Tenant parameters
 */
export async function updateTenantAction(input: UpdateTenantInput) {
  try {
    const { id, name, subscriptionPlan, status, maxTables, adminEmail } = input;

    if (!id) {
      return { success: false, error: 'ID Tenant wajib diisi' };
    }

    const calculatedMaxTables =
      maxTables || (subscriptionPlan ? PLAN_MAX_TABLES[subscriptionPlan.toLowerCase()] : undefined);

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(subscriptionPlan && { subscriptionPlan: subscriptionPlan.toLowerCase() }),
        ...(status && { status }),
        ...(calculatedMaxTables && { maxTables: calculatedMaxTables }),
        ...(adminEmail && { adminEmail: adminEmail.trim().toLowerCase() }),
      },
    });

    revalidatePath('/superadmin/tenants');

    return {
      success: true,
      data: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        code: updatedTenant.code,
        subscriptionPlan: updatedTenant.subscriptionPlan,
        status: updatedTenant.status,
        maxTables: updatedTenant.maxTables,
        adminEmail: updatedTenant.adminEmail,
      },
    };
  } catch (error: any) {
    console.error('updateTenantAction Error:', error);
    return { success: false, error: error.message || 'Gagal mengupdate data tenant' };
  }
}

/**
 * Delete a Tenant by ID
 */
export async function deleteTenantAction(id: string) {
  try {
    if (!id) {
      return { success: false, error: 'ID Tenant wajib diisi' };
    }

    await prisma.tenant.delete({ where: { id } });

    revalidatePath('/superadmin/tenants');

    return { success: true, message: 'Tenant berhasil dihapus' };
  } catch (error: any) {
    console.error('deleteTenantAction Error:', error);
    return { success: false, error: error.message || 'Gagal menghapus tenant' };
  }
}
