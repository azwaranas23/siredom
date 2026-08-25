import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
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
      status: t.status,
      maxTables: t.maxTables,
      activeMatches: t.matchSessions.length,
      adminEmail: t.adminEmail,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ status: 'success', data: formattedTenants });
  } catch (error: any) {
    console.error('Failed to fetch tenants:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch tenants', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code, subscriptionPlan, maxTables, adminEmail, adminPassword } = body;

    if (!name || !code || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { status: 'error', message: 'Nama, Kode Tenant, Email Admin, dan Password wajib diisi' },
        { status: 400 }
      );
    }

    const uppercaseCode = code.trim().toUpperCase();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    const newTenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        code: uppercaseCode,
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPasswordHash: passwordHash,
        subscriptionPlan: subscriptionPlan || 'pro',
        maxTables: Number(maxTables) || 10,
        status: 'active',
        users: {
          create: {
            name: `Admin ${name}`,
            email: adminEmail.trim().toLowerCase(),
            passwordHash,
            role: 'ADMIN',
          },
        },
        tableMasters: {
          create: {
            tableNumber: 1,
            tableName: 'Meja Utama 01',
            pinCode: Math.floor(1000 + Math.random() * 9000).toString(),
            status: 'active',
          },
        },
      },
      include: {
        tableMasters: true,
      },
    });

    return NextResponse.json({ status: 'success', data: newTenant }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create tenant:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal membuat tenant', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, subscriptionPlan, status, maxTables, adminEmail } = body;

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'ID Tenant diperlukan' }, { status: 400 });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subscriptionPlan && { subscriptionPlan }),
        ...(status && { status }),
        ...(maxTables && { maxTables: Number(maxTables) }),
        ...(adminEmail && { adminEmail }),
      },
    });

    return NextResponse.json({ status: 'success', data: updatedTenant });
  } catch (error: any) {
    console.error('Failed to update tenant:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal mengupdate tenant', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'ID Tenant diperlukan' }, { status: 400 });
    }

    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ status: 'success', message: 'Tenant berhasil dihapus' });
  } catch (error: any) {
    console.error('Failed to delete tenant:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal menghapus tenant', error: error.message },
      { status: 500 }
    );
  }
}
