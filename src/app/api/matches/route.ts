import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setupMatchAction, commitRoundAction, rollbackRoundAction } from '@/features/scorer/actions';
import { releaseTableSessionAction } from '@/app/actions/tableActions';
import { PlayersDataDocument, PublicTableInfo, RoundsHistoryDocument } from '@/types/domino';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get('tenantCode');
    const tableIdParam = searchParams.get('tableId');
    const tableNumberParam = searchParams.get('tableNumber');
    const tableNumber = Number(tableNumberParam) || 1;

    // Tenant code wajib — tidak ada fallback hardcoded.
    if (!tenantCode || !tenantCode.trim()) {
      return NextResponse.json(
        { status: 'error', message: 'Parameter tenantCode wajib diisi' },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: { code: { equals: tenantCode.trim(), mode: 'insensitive' } },
    });

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

    // Respons aman untuk klien publik: TANPA pinCode.
    const publicTables: PublicTableInfo[] = masterTables.map((t) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      tableName: t.tableName,
      status: t.status,
      isLocked: t.isLocked,
      activeDeviceId: t.activeDeviceId,
    }));

    const match = await prisma.matchSession.findFirst({
      where: {
        tenantId: tenant.id,
        tableId: table.id,
        status: 'IN_PROGRESS',
      },
      orderBy: { createdAt: 'desc' },
    });

    const tableInfo: PublicTableInfo = {
      id: table.id,
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      status: table.status,
      isLocked: table.isLocked,
      activeDeviceId: table.activeDeviceId,
    };

    if (!match) {
      return NextResponse.json({
        status: 'success',
        data: null,
        masterTables: publicTables,
        tableInfo,
        message: `Belum ada sesi pertandingan aktif di Meja #${table.tableNumber}`,
      });
    }

    const formattedMatch = {
      ...match,
      players: (match.playersData as unknown as PlayersDataDocument) || [],
      rounds: (match.roundsHistory as unknown as RoundsHistoryDocument) || [],
    };

    return NextResponse.json({
      status: 'success',
      data: formattedMatch,
      masterTables: publicTables,
      tableInfo,
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

    // Action 1: Lock Table Session to Single Device (atomic anti-race claim)
    if (action === 'LOCK_TABLE' && tableId && deviceId) {
      const claim = await prisma.tableMaster.updateMany({
        where: {
          id: tableId,
          OR: [{ isLocked: false }, { activeDeviceId: deviceId }],
        },
        data: {
          isLocked: true,
          activeDeviceId: deviceId,
        },
      });

      if (claim.count === 0) {
        const current = await prisma.tableMaster.findUnique({
          where: { id: tableId },
          select: { activeDeviceId: true, isLocked: true },
        });
        return NextResponse.json(
          {
            status: 'error',
            message: 'Meja sedang dikunci oleh perangkat lain',
            lockedBy: current?.activeDeviceId ?? null,
          },
          { status: 409 }
        );
      }

      const locked = await prisma.tableMaster.findUnique({ where: { id: tableId } });
      return NextResponse.json({ status: 'success', data: locked });
    }

    // Action 2: Unlock Table Session — delegasi ke releaseTableSessionAction
    // (satu sumber kebenaran semantik unlock; devlog/0009 review)
    if (action === 'UNLOCK_TABLE' && tableId) {
      const res = await releaseTableSessionAction({ tableId, deviceId });

      if (res.status !== 'success') {
        return NextResponse.json({ status: 'error', message: res.message }, { status: 409 });
      }

      return NextResponse.json({ status: 'success', message: 'Session lock berhasil dibuka' });
    }

    // Action 3: Mid-Game Target Modifier
    if (action === 'UPDATE_TARGET' && matchId && updateTargetData) {
      const { matchMode, targetValue } = updateTargetData;

      const updated = await prisma.matchSession.update({
        where: { id: matchId },
        data: {
          ...(matchMode && {
            matchMode: matchMode.toUpperCase(),
            targetType: matchMode.toLowerCase() === 'rounds' ? 'FIXED_ROUNDS' : 'RACE_TO_POINTS',
          }),
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
        tenantCode: input.tenantCode,
        tableId: input.tableId || tableId,
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
        deviceId: input.deviceId || deviceId,
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
        kandangVariant: input.kandangVariant,
        kandangRecipients: input.kandangRecipients,
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
