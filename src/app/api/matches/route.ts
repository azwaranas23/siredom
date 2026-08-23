import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setupMatchAction, commitRoundAction, rollbackRoundAction } from '@/features/scorer/actions';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get('tenantCode') || 'TAB-SLOWBAR';
    const tableIdParam = searchParams.get('tableId');
    const tableNumberParam = searchParams.get('tableNumber');
    const tableNumber = Number(tableNumberParam) || 1;

    // Try finding tenant by code
    let tenant = await prisma.tenant.findFirst({
      where: { code: { equals: tenantCode, mode: 'insensitive' } },
    });

    // Fallback: try finding first active tenant if code doesn't match
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { status: 'active' },
      });
    }

    if (!tenant) {
      return NextResponse.json({ status: 'error', message: 'Tenant tidak ditemukan' }, { status: 404 });
    }

    // Fetch all master tables for tenant
    const masterTables = await prisma.tableMaster.findMany({
      where: { tenantId: tenant.id },
      orderBy: { tableNumber: 'asc' },
    });

    let table = null;
    if (tableIdParam) {
      table = masterTables.find((t) => t.id === tableIdParam || t.tableNumber === Number(tableIdParam));
    }
    if (!table) {
      table = masterTables.find((t) => t.tableNumber === tableNumber) || masterTables[0];
    }

    if (!table) {
      return NextResponse.json({ status: 'error', message: 'Meja tidak ditemukan' }, { status: 404 });
    }

    const match = await prisma.matchSession.findFirst({
      where: {
        tenantId: tenant.id,
        tableId: table.id,
        status: 'IN_PROGRESS',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!match) {
      return NextResponse.json({
        status: 'success',
        data: null,
        masterTables,
        tableInfo: {
          id: table.id,
          tableNumber: table.tableNumber,
          tableName: table.tableName,
          isLocked: (table as any).isLocked || false,
          activeDeviceId: (table as any).activeDeviceId || null,
        },
        message: `Belum ada sesi pertandingan aktif di Meja #${table.tableNumber}`,
      });
    }

    const formattedMatch = {
      ...match,
      players: (match.playersData as any[]) || [],
      rounds: (match.roundsHistory as any[]) || [],
    };

    return NextResponse.json({
      status: 'success',
      data: formattedMatch,
      masterTables,
      tableInfo: {
        id: table.id,
        tableNumber: table.tableNumber,
        tableName: table.tableName,
        isLocked: (table as any).isLocked || false,
        activeDeviceId: (table as any).activeDeviceId || null,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch match:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal mengambil data pertandingan', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, tableId, deviceId, matchId, setupData, roundData, updateTargetData } = body;

    // Action 1: Lock Table Session to Single Device
    if (action === 'LOCK_TABLE' && tableId && deviceId) {
      const table = await prisma.tableMaster.update({
        where: { id: tableId },
        data: {
          isLocked: true,
          activeDeviceId: deviceId,
        },
      });

      return NextResponse.json({ status: 'success', data: table });
    }

    // Action 2: Unlock Table Session
    if (action === 'UNLOCK_TABLE' && tableId) {
      const table = await prisma.tableMaster.update({
        where: { id: tableId },
        data: {
          isLocked: false,
          activeDeviceId: null,
        },
      });

      return NextResponse.json({ status: 'success', message: 'Session lock berhasil dibuka' });
    }

    // Action 3: Mid-Game Target Modifier
    if (action === 'UPDATE_TARGET' && matchId && updateTargetData) {
      const { matchMode, targetValue } = updateTargetData;

      const updated = await prisma.matchSession.update({
        where: { id: matchId },
        data: {
          ...(matchMode && { matchMode: matchMode.toUpperCase() }),
          ...(targetValue && { targetValue: Number(targetValue) }),
        },
      });

      return NextResponse.json({ status: 'success', data: updated });
    }

    // Action 4: Setup Match
    if (action === 'SETUP_MATCH') {
      const input = setupData || body;
      const res = await setupMatchAction({
        matchId: input.matchId || matchId,
        tenantCode: input.tenantCode || 'TAB-SLOWBAR',
        tableNumber: Number(input.tableNumber) || 1,
        rulesetMode: input.rulesetMode,
        matchCategory: input.matchCategory,
        matchMode: input.matchMode,
        targetType: input.targetType,
        targetValue: Number(input.targetValue),
        pointsConfig: input.pointsConfig,
        rulesConfig: input.rulesConfig,
        oradoConfig: input.oradoConfig,
        players: input.players || [],
      });

      return NextResponse.json(res, { status: res.status === 'success' ? 200 : 400 });
    }

    // Action 5: Commit Round
    if (action === 'COMMIT_ROUND' && matchId) {
      const input = roundData || body;
      const res = await commitRoundAction({
        matchId,
        winnerPlayerId: input.winnerPlayerId,
        winnerTeam: input.winnerTeam,
        actionType: input.actionType,
        victimPlayerId: input.victimPlayerId,
        manualStatuses: input.manualStatuses,
        rawPointsInput: input.rawPointsInput || input.rawRemainingPoints,
        oradoMultipliers: input.oradoMultipliers || input.multipliers,
        isPenalty: input.isPenalty,
        penaltyAmount: input.penaltyAmount,
      });

      return NextResponse.json(res, { status: res.status === 'success' ? 201 : 400 });
    }

    // Action 6: Rollback Last Round
    if (action === 'ROLLBACK' && matchId) {
      const res = await rollbackRoundAction(matchId);
      return NextResponse.json(res, { status: res.status === 'success' ? 200 : 400 });
    }

    return NextResponse.json({ status: 'error', message: 'Action tidak dikenal' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed in POST /api/matches:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal memproses aksi pertandingan', error: error.message },
      { status: 500 }
    );
  }
}
