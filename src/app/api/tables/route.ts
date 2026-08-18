import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get('tenantCode') || 'TAB-SLOWBAR';

    const tenant = await prisma.tenant.findUnique({
      where: { code: tenantCode.toUpperCase() },
      include: {
        tableMasters: {
          orderBy: { tableNumber: 'asc' },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ status: 'error', message: 'Tenant tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ status: 'success', data: tenant.tableMasters });
  } catch (error: any) {
    console.error('Failed to fetch tables:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal mengambil data meja', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantCode, tableNumber, tableName, pinCode } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { code: (tenantCode || 'TAB-SLOWBAR').toUpperCase() },
    });

    if (!tenant) {
      return NextResponse.json({ status: 'error', message: 'Tenant tidak ditemukan' }, { status: 404 });
    }

    const tableNum = Number(tableNumber) || 1;
    const pin = pinCode || '1234';
    const name = tableName || `Meja Utama ${tableNum < 10 ? '0' + tableNum : tableNum}`;

    const newTable = await prisma.tableMaster.create({
      data: {
        tenantId: tenant.id,
        tableNumber: tableNum,
        tableName: name,
        pinCode: pin,
        status: 'active',
      },
    });

    return NextResponse.json({ status: 'success', data: newTable }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create table:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal membuat meja master', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, tableName, pinCode, status } = body;

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'ID Meja diperlukan' }, { status: 400 });
    }

    const updatedTable = await prisma.tableMaster.update({
      where: { id },
      data: {
        ...(tableName && { tableName }),
        ...(pinCode && { pinCode }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ status: 'success', data: updatedTable });
  } catch (error: any) {
    console.error('Failed to update table:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal mengupdate meja', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'ID Meja diperlukan' }, { status: 400 });
    }

    await prisma.tableMaster.delete({ where: { id } });

    return NextResponse.json({ status: 'success', message: 'Meja berhasil dihapus' });
  } catch (error: any) {
    console.error('Failed to delete table:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal menghapus meja', error: error.message },
      { status: 500 }
    );
  }
}
