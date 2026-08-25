'use server';

import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export interface LoginInput {
  role: 'superadmin' | 'admin' | 'wasit';
  identifier: string; // Tenant Code or Admin Email or Wasit Table PIN
  password?: string;
  tableNumber?: number;
}

/**
 * Server Action for authenticating Super Admin, Cafe Admin, and Wasit users.
 * Verifies credentials strictly against the database (bcrypt for passwords,
 * exact-match PIN per TableMaster). Issues a signed httpOnly session cookie
 * that middleware uses to protect /admin/*, /superadmin/*, and mutating API calls.
 */
export async function loginAction(input: LoginInput) {
  try {
    const { role, identifier, password = '', tableNumber = 1 } = input;

    if (!identifier) {
      return { success: false, error: 'Identifier (Email / Kode Tenant / PIN) wajib diisi' };
    }

    const trimmedInput = identifier.trim();

    // 1. Super Admin Authentication
    if (role === 'superadmin') {
      const normalizedEmail = trimmedInput.toLowerCase();

      const user = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          role: 'SUPER_ADMIN',
        },
      });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return { success: false, error: 'Kredensial Super Admin tidak valid' };
      }

      await issueSessionCookie({ role: 'superadmin', tenantCode: 'SUPERADMIN', tableNumber: 1 });

      return {
        success: true,
        role: 'superadmin',
        tenantCode: 'SUPERADMIN',
        tableNumber: 1,
      };
    }

    // 2. Cafe Admin Authentication
    if (role === 'admin') {
      const normalizedEmail = trimmedInput.toLowerCase();
      const uppercaseCode = trimmedInput.toUpperCase();

      // Find Tenant by Code OR adminEmail
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [{ code: uppercaseCode }, { adminEmail: normalizedEmail }],
        },
        include: {
          users: true,
        },
      });

      if (!tenant) {
        return { success: false, error: 'Tenant / Cafe Admin tidak ditemukan' };
      }

      if (tenant.status === 'suspended') {
        return { success: false, error: 'Akun Tenant Anda sedang ditangguhkan (Suspended). Silakan hubungi Super Admin.' };
      }

      // Verify against User record first, then Tenant.adminPasswordHash as backup
      const cafeAdminUser = tenant.users.find((u) => u.role === 'ADMIN');
      const storedHash = cafeAdminUser?.passwordHash || tenant.adminPasswordHash;

      if (!storedHash || !(await bcrypt.compare(password, storedHash))) {
        return { success: false, error: 'Password Admin Cafe tidak valid' };
      }

      await issueSessionCookie({ role: 'admin', tenantCode: tenant.code, tableNumber: 1 });

      return {
        success: true,
        role: 'admin',
        tenantCode: tenant.code,
        tableNumber: 1,
      };
    }

    // 3. Wasit Table PIN Authentication
    if (role === 'wasit') {
      const selectedTableNum = Number(tableNumber) || 1;

      // Exact match on table number AND pin code — no fallbacks.
      const table = await prisma.tableMaster.findFirst({
        where: {
          tableNumber: selectedTableNum,
          pinCode: trimmedInput,
        },
        include: {
          tenant: true,
        },
      });

      if (!table) {
        return { success: false, error: `PIN Wasit Meja #${selectedTableNum} salah atau tidak ditemukan` };
      }

      const tenantCode = table.tenant?.code;
      if (!tenantCode) {
        return { success: false, error: 'Meja ini belum terhubung ke penyelenggara mana pun' };
      }

      await issueSessionCookie({ role: 'wasit', tenantCode, tableNumber: table.tableNumber });

      return {
        success: true,
        role: 'wasit',
        tenantCode,
        tableNumber: table.tableNumber,
      };
    }

    return { success: false, error: 'Role tidak valid' };
  } catch (error: any) {
    console.error('loginAction Error:', error);
    return { success: false, error: error.message || 'Gagal melakukan login' };
  }
}

/** Terbitkan cookie sesi bertanda tangan (httpOnly). */
export async function issueSessionCookie(payload: { role: 'superadmin' | 'admin' | 'wasit'; tenantCode?: string; tableNumber?: number }) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}
