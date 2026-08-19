import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get('tenantCode') || 'TAB-SLOWBAR';
    const tableNumber = Number(searchParams.get('tableNumber')) || 1;

    const tenant = await prisma.tenant.findUnique({
      where: { code: tenantCode.toUpperCase() },
    });

    if (!tenant) {
      return NextResponse.json({ status: 'error', message: 'Tenant tidak ditemukan' }, { status: 404 });
    }

    const table = await prisma.tableMaster.findFirst({
      where: { tenantId: tenant.id, tableNumber },
    });

    if (!table) {
      return NextResponse.json({ status: 'error', message: 'Meja tidak ditemukan' }, { status: 404 });
    }

    const match = await prisma.matchSession.findFirst({
      where: {
        tenantId: tenant.id,
        tableId: table.id,
        status: 'IN_PROGRESS',
      },
      include: {
        players: { orderBy: { seatNumber: 'asc' } },
        rounds: {
          include: { scores: true },
          orderBy: { roundNumber: 'desc' },
        },
      },
    });

    if (!match) {
      return NextResponse.json({
        status: 'success',
        data: null,
        tableInfo: {
          id: table.id,
          tableNumber: table.tableNumber,
          tableName: table.tableName,
          isLocked: (table as any).isLocked || false,
          activeDeviceId: (table as any).activeDeviceId || null,
        },
        message: `Belum ada sesi pertandingan aktif di Meja #${tableNumber}`,
      });
    }

    return NextResponse.json({
      status: 'success',
      data: match,
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
      const table = await (prisma.tableMaster as any).update({
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
      const table = await (prisma.tableMaster as any).update({
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

    // Action 4: Setup Match (Change mode, target, player names)
    if (action === 'SETUP_MATCH') {
      const { matchMode, targetValue, pointsConfig, players, tenantCode, tableNumber } = setupData || body;

      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      const tblNum = Number(tableNumber) || 1;

      const tenant = await prisma.tenant.findUnique({
        where: { code: codeToUse.toUpperCase() },
      });

      if (!tenant) {
        return NextResponse.json({ status: 'error', message: 'Tenant tidak ditemukan' }, { status: 404 });
      }

      const table = await prisma.tableMaster.findFirst({
        where: { tenantId: tenant.id, tableNumber: tblNum },
      });

      if (!table) {
        return NextResponse.json({ status: 'error', message: 'Meja tidak ditemukan' }, { status: 404 });
      }

      const updatedMatch = await prisma.$transaction(async (tx) => {
        let mSession = matchId ? await tx.matchSession.findUnique({ where: { id: matchId } }) : null;

        if (!mSession) {
          mSession = await tx.matchSession.findFirst({
            where: { tenantId: tenant.id, tableId: table.id, status: 'IN_PROGRESS' },
          });
        }

        if (!mSession) {
          mSession = await tx.matchSession.create({
            data: {
              tenantId: tenant.id,
              tableId: table.id,
              tableNumber: tblNum,
              matchMode: matchMode ? (matchMode.toUpperCase() as any) : 'ROUNDS',
              targetValue: Number(targetValue) || 10,
              pointsConfig: pointsConfig || undefined,
              status: 'IN_PROGRESS',
            },
          });
        } else {
          mSession = await tx.matchSession.update({
            where: { id: mSession.id },
            data: {
              matchMode: matchMode ? (matchMode.toUpperCase() as any) : mSession.matchMode,
              targetValue: Number(targetValue) || mSession.targetValue,
              ...(pointsConfig && { pointsConfig }),
              status: 'IN_PROGRESS',
            },
          });
        }

        if (Array.isArray(players)) {
          for (const p of players) {
            const existingP = await tx.player.findFirst({
              where: { matchId: mSession.id, seatNumber: p.seatNumber },
            });

            if (existingP) {
              await tx.player.update({
                where: { id: existingP.id },
                data: { name: p.name },
              });
            } else {
              await tx.player.create({
                data: {
                  matchId: mSession.id,
                  seatNumber: p.seatNumber,
                  name: p.name || `Pemain ${p.seatNumber}`,
                  currentScore: 0,
                },
              });
            }
          }
        }

        return tx.matchSession.findUnique({
          where: { id: mSession.id },
          include: { players: { orderBy: { seatNumber: 'asc' } } },
        });
      });

      return NextResponse.json({ status: 'success', data: updatedMatch });
    }

    // Action 5: Commit Round (Record round winner/victim and update player scores)
    if (action === 'COMMIT_ROUND' && matchId && roundData) {
      const { roundNumber, actionType, winnerPlayerId, victimPlayerId, playerScores } = roundData;

      const committedRound = await prisma.$transaction(async (tx) => {
        const dbActionType = (actionType.toUpperCase() as any) || 'MENANG_BIASA';

        // Fetch DB players for this match
        const dbPlayers = await tx.player.findMany({
          where: { matchId },
          orderBy: { seatNumber: 'asc' },
        });

        // Map winner and victim IDs to real database CUIDs
        let realWinnerId = winnerPlayerId;
        let realVictimId = victimPlayerId;

        const winnerSeat = playerScores?.find((ps: any) => ps.playerId === winnerPlayerId)?.seatNumber;
        if (winnerSeat) {
          const foundW = dbPlayers.find((p) => p.seatNumber === winnerSeat);
          if (foundW) realWinnerId = foundW.id;
        }

        if (victimPlayerId) {
          const victimSeat = playerScores?.find((ps: any) => ps.playerId === victimPlayerId)?.seatNumber;
          if (victimSeat) {
            const foundV = dbPlayers.find((p) => p.seatNumber === victimSeat);
            if (foundV) realVictimId = foundV.id;
          }
        }

        // Build score records for Round
        const scoreRecords = (playerScores || []).map((ps: any) => {
          let realPlayerId = ps.playerId;
          if (ps.seatNumber) {
            const foundP = dbPlayers.find((p) => p.seatNumber === ps.seatNumber);
            if (foundP) realPlayerId = foundP.id;
          }

          return {
            playerId: realPlayerId,
            statusTag: ps.statusTag || 'normal',
            pointsAwarded: Number(ps.pointsAwarded) || 0,
            scoreAfter: Number(ps.scoreAfter) || 0,
          };
        });

        const r = await tx.round.create({
          data: {
            matchId,
            roundNumber,
            actionType: dbActionType,
            winnerPlayerId: realWinnerId,
            victimPlayerId: realVictimId,
            scores: {
              create: scoreRecords,
            },
          },
        });

        // Update currentScore for each player in DB by seatNumber / ID
        for (const ps of playerScores || []) {
          const realScore = Number(ps.scoreAfter) || 0;
          if (ps.seatNumber) {
            await tx.player.updateMany({
              where: { matchId, seatNumber: ps.seatNumber },
              data: { currentScore: realScore },
            });
          } else {
            await tx.player.update({
              where: { id: ps.playerId },
              data: { currentScore: realScore },
            }).catch(() => {});
          }
        }

        return r;
      });

      return NextResponse.json({ status: 'success', data: committedRound }, { status: 201 });
    }

    // Action 6: Rollback Last Round
    if (action === 'ROLLBACK' && matchId) {
      const lastRound = await prisma.round.findFirst({
        where: { matchId },
        orderBy: { roundNumber: 'desc' },
        include: { scores: true },
      });

      if (!lastRound) {
        return NextResponse.json({ status: 'error', message: 'Tidak ada ronde untuk di-rollback' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Delete last round scores and round record
        await tx.roundScore.deleteMany({ where: { roundId: lastRound.id } });
        await tx.round.delete({ where: { id: lastRound.id } });

        // Recalculate player scores from remaining rounds
        const dbPlayers = await tx.player.findMany({ where: { matchId } });
        const remainingRounds = await tx.round.findMany({
          where: { matchId },
          include: { scores: true },
          orderBy: { roundNumber: 'asc' },
        });

        for (const player of dbPlayers) {
          let scoreSum = 0;
          for (const rnd of remainingRounds) {
            const sc = rnd.scores.find((s) => s.playerId === player.id);
            if (sc) scoreSum += sc.pointsAwarded;
          }
          await tx.player.update({
            where: { id: player.id },
            data: { currentScore: scoreSum },
          });
        }
      });

      return NextResponse.json({ status: 'success', message: 'Rollback ronde berhasil' });
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
