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

    let match = await prisma.matchSession.findFirst({
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

    // If no active match exists, create one with default 4 players
    if (!match) {
      match = await prisma.matchSession.create({
        data: {
          tenantId: tenant.id,
          tableId: table.id,
          tableNumber,
          matchMode: 'ROUNDS',
          targetValue: 10,
          status: 'IN_PROGRESS',
          pointsConfig: {
            menangBiasa: 1,
            kandang: 2,
            ceki: 3,
            palang: 4,
            tangkap: 3,
          },
          players: {
            create: [
              { seatNumber: 1, name: 'Maman', currentScore: 0 },
              { seatNumber: 2, name: 'Topati', currentScore: 0 },
              { seatNumber: 3, name: 'Fatir', currentScore: 0 },
              { seatNumber: 4, name: 'Udin', currentScore: 0 },
            ],
          },
        },
        include: {
          players: { orderBy: { seatNumber: 'asc' } },
          rounds: {
            include: { scores: true },
            orderBy: { roundNumber: 'desc' },
          },
        },
      });
    }

    return NextResponse.json({ status: 'success', data: match });
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
    const { action, matchId, roundData, playersData, setupData } = body;

    // Action 1: Setup Match (Change mode, target, player names)
    if (action === 'SETUP_MATCH' && matchId) {
      const { matchMode, targetValue, pointsConfig, players } = setupData;

      const updatedMatch = await prisma.$transaction(async (tx) => {
        const m = await tx.matchSession.update({
          where: { id: matchId },
          data: {
            matchMode,
            targetValue: Number(targetValue),
            pointsConfig,
          },
        });

        if (Array.isArray(players)) {
          for (const p of players) {
            await tx.player.updateMany({
              where: { matchId, seatNumber: p.seatNumber },
              data: { name: p.name },
            });
          }
        }

        return tx.matchSession.findUnique({
          where: { id: matchId },
          include: { players: { orderBy: { seatNumber: 'asc' } } },
        });
      });

      return NextResponse.json({ status: 'success', data: updatedMatch });
    }

    // Action 2: Commit Round (Record round winner/victim and update player scores)
    if (action === 'COMMIT_ROUND' && matchId && roundData) {
      const { roundNumber, actionType, winnerPlayerId, victimPlayerId, playerScores } = roundData;

      const committedRound = await prisma.$transaction(async (tx) => {
        // Map frontend action strings to DB ActionType
        const dbActionType = (actionType.toUpperCase() as any) || 'MENANG_BIASA';

        const r = await tx.round.create({
          data: {
            matchId,
            roundNumber,
            actionType: dbActionType,
            winnerPlayerId,
            victimPlayerId,
            scores: {
              create: playerScores.map((ps: any) => ({
                playerId: ps.playerId,
                statusTag: ps.statusTag || 'normal',
                pointsAwarded: ps.pointsAwarded,
                scoreAfter: ps.scoreAfter,
              })),
            },
          },
        });

        // Update currentScore for each player in DB
        for (const ps of playerScores) {
          await tx.player.update({
            where: { id: ps.playerId },
            data: { currentScore: ps.scoreAfter },
          });
        }

        return r;
      });

      return NextResponse.json({ status: 'success', data: committedRound }, { status: 201 });
    }

    // Action 3: Rollback Last Round
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
        // Revert player scores based on scores before this round
        for (const sc of lastRound.scores) {
          const scoreBefore = sc.scoreAfter - sc.pointsAwarded;
          await tx.player.update({
            where: { id: sc.playerId },
            data: { currentScore: Math.max(0, scoreBefore) },
          });
        }

        await tx.round.delete({ where: { id: lastRound.id } });
      });

      return NextResponse.json({ status: 'success', message: 'Ronde berhasil di-rollback' });
    }

    return NextResponse.json({ status: 'error', message: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to process match action:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal memproses aksi pertandingan', error: error.message },
      { status: 500 }
    );
  }
}
