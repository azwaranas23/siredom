'use server';

// Server-authoritative Scorer Actions (JSON Document-Relational Model)
import { prisma } from '@/lib/prisma';
import { broadcastRoundCommitted } from '@/lib/supabase';
import { getRulesetEngine } from './engine/RulesetEngineFactory';
import { ActionType, RoundStatusTag, TeamIdentifier, RulesetMode, MatchCategory, PlayersDataDocument, RoundsHistoryDocument } from '@/types/domino';
import { Prisma } from '@prisma/client';

export interface CommitRoundInput {
  matchId: string;
  winnerPlayerId?: string | null;
  winnerTeam?: TeamIdentifier;
  actionType: ActionType | string;
  victimPlayerId?: string | null;
  manualStatuses?: Record<string, RoundStatusTag | string>;
  rawPointsInput?: number;
  oradoMultipliers?: {
    duaUjung?: boolean;
    balakHabis?: boolean;
    macetBeradu?: boolean;
    balak0Mati?: boolean;
  };
  isPenalty?: boolean;
  penaltyAmount?: number;
  /** Ticket GH#7 — Kandang PORDI granular */
  kandangVariant?: import('@/types/domino').KandangVariant;
  kandangRecipients?: string[];
}

export interface ApplyPenaltyInput {
  matchId: string;
  offenderPlayerId: string;
  penaltyAmount: 1 | 3 | 4; // Pasal 14: +1 ringan / +3 turun ganda / +4 passed palsu
}

export interface SetupMatchInput {
  matchId?: string;
  tenantCode?: string;
  tableId?: string;
  tableNumber?: number;
  rulesetMode?: RulesetMode;
  matchCategory?: MatchCategory;
  matchMode?: 'rounds' | 'points' | 'ROUNDS' | 'POINTS';
  targetType?: string;
  targetValue?: number;
  pointsConfig?: any;
  rulesConfig?: any;
  oradoConfig?: any;
  players: { seatNumber: 1 | 2 | 3 | 4; name: string }[];
  deviceId?: string;
}

export async function commitRoundAction(input: CommitRoundInput) {
  try {
    const { matchId, winnerPlayerId, winnerTeam, actionType, victimPlayerId, manualStatuses, rawPointsInput, oradoMultipliers, isPenalty, penaltyAmount, kandangVariant, kandangRecipients } = input;

    // 1. Fetch match session
    const matchSession = await prisma.matchSession.findUnique({
      where: { id: matchId },
      include: { table: true },
    });

    if (!matchSession) {
      return { status: 'error', message: 'Sesi pertandingan tidak ditemukan' };
    }

    if (matchSession.status !== 'IN_PROGRESS') {
      return { status: 'error', message: 'Sesi pertandingan telah selesai atau dibatalkan' };
    }

    // 2. Map uppercase enums & parse JSON arrays
    const normalizedActionType = (String(actionType).toUpperCase() as ActionType) || 'MENANG_BIASA';
    const normalizedWinnerTeam = (winnerTeam as TeamIdentifier) || 'NONE';

    const existingPlayers: PlayersDataDocument = Array.isArray(matchSession.playersData) ? (matchSession.playersData as unknown as PlayersDataDocument) : [];
    const existingRounds: RoundsHistoryDocument = Array.isArray(matchSession.roundsHistory) ? (matchSession.roundsHistory as unknown as RoundsHistoryDocument) : [];

    // Find real CUID or seat Number for winner & victim
    let dbWinnerId = winnerPlayerId;
    let dbVictimId = victimPlayerId;

    if (winnerPlayerId) {
      const foundW = existingPlayers.find((p) => p.id === winnerPlayerId || p.seatNumber === Number(winnerPlayerId));
      if (foundW) dbWinnerId = foundW.id;
    }
    if (victimPlayerId) {
      const foundV = existingPlayers.find((p) => p.id === victimPlayerId || p.seatNumber === Number(victimPlayerId));
      if (foundV) dbVictimId = foundV.id;
    }

    // 3. Execute IRulesetEngine calculation
    const engine = getRulesetEngine(matchSession.rulesetMode);
    const calculationResult = engine.calculateRound({
      rulesetMode: matchSession.rulesetMode,
      matchCategory: matchSession.matchCategory,
      rulesConfig: (matchSession.rulesConfig as unknown as Record<string, unknown>) || {},
      pointsConfig: (matchSession.pointsConfig as unknown as import('@/types/domino').PointsConfig) || undefined,
      winnerPlayerId: dbWinnerId,
      winnerTeam: normalizedWinnerTeam,
      actionType: normalizedActionType,
      victimPlayerId: dbVictimId,
      manualStatuses,
      rawPointsInput,
      oradoMultipliers,
      isPenalty,
      penaltyAmount,
      kandangVariant,
      kandangRecipients,
      players: existingPlayers.map((p) => ({
        id: p.id,
        seatNumber: p.seatNumber,
        teamIdentifier: p.teamIdentifier,
        currentScore: p.currentScore,
      })),
      currentRoundsCount: existingRounds.length,
      currentSet: matchSession.currentSet,
      targetValue: matchSession.targetValue,
      matchMode: matchSession.matchMode,
      targetType: matchSession.targetType,
      teamASetWins: matchSession.teamASetWins,
      teamBSetWins: matchSession.teamBSetWins,
    });

    // 4. Construct optimistic Round object
    const nextRoundNumber = existingRounds.length + 1;
    const newRound = {
      id: `rnd-${Date.now()}-${nextRoundNumber}`,
      setNumber: calculationResult.currentSet || matchSession.currentSet || 1,
      roundNumber: nextRoundNumber,
      actionType: normalizedActionType,
      winnerPlayerId: dbWinnerId || undefined,
      winnerTeam: normalizedWinnerTeam,
      victimPlayerId: dbVictimId || undefined,
      winType: calculationResult.winType,
      rawPointsInput: Number(rawPointsInput) || 0,
      isPenalty: Boolean(calculationResult.isPenalty),
      ...(kandangVariant && { kandangVariant }),
      ...(kandangRecipients?.length && { kandangRecipients }),
      timestamp: new Date().toISOString(),
      scores: calculationResult.roundScores.map((scoreItem) => {
        let targetPlayerId = scoreItem.playerId;
        if (scoreItem.seatNumber) {
          const pObj = existingPlayers.find((p) => p.seatNumber === scoreItem.seatNumber);
          if (pObj) targetPlayerId = pObj.id;
        }
        return {
          id: `sc-${Date.now()}-${targetPlayerId}`,
          playerId: targetPlayerId,
          seatNumber: scoreItem.seatNumber,
          statusTag: (String(scoreItem.statusTag).toUpperCase() as RoundStatusTag) || 'DUDUK',
          pointsAwarded: scoreItem.pointsAwarded,
          scoreAfter: scoreItem.scoreAfter,
        };
      }),
    };

    const updatedPlayers = existingPlayers.map((p) => {
      const sc = calculationResult.roundScores.find((s) => s.playerId === p.id || s.seatNumber === p.seatNumber);
      return {
        ...p,
        currentScore: sc ? sc.scoreAfter : p.currentScore,
      };
    });

    // Transisi set ORADO (devlog/0008): set dimenangkan tetapi match belum selesai
    // → arsipkan skor set ke totalScore, lalu currentScore semua pemain mulai dari 0 lagi
    // agar set berikutnya balapan segar menuju 101 (regulasi Best of 3).
    const isSetTransition = Boolean((calculationResult as { setJustWon?: boolean }).setJustWon)
      && !calculationResult.isMatchComplete;
    const playersToPersist = isSetTransition
      ? updatedPlayers.map((p) => ({
          ...p,
          totalScore: (p.totalScore ?? 0) + p.currentScore,
          currentScore: 0,
        }))
      : updatedPlayers;

    const nextStatus = calculationResult.isMatchComplete ? 'COMPLETED' : 'IN_PROGRESS';

    // 5. Single-row atomic update on MatchSession
    const updatedSession = await prisma.matchSession.update({
      where: { id: matchSession.id },
      data: {
        status: nextStatus,
        playersData: playersToPersist as unknown as Prisma.InputJsonValue,
        roundsHistory: [...existingRounds, newRound] as unknown as Prisma.InputJsonValue,
        ...(calculationResult.newTargetValue && { targetValue: calculationResult.newTargetValue }),
        ...(calculationResult.currentSet !== undefined && { currentSet: calculationResult.currentSet }),
        ...(calculationResult.teamASetWins !== undefined && { teamASetWins: calculationResult.teamASetWins }),
        ...(calculationResult.teamBSetWins !== undefined && { teamBSetWins: calculationResult.teamBSetWins }),
      },
    });

    // 6. Post-transaction Supabase Realtime broadcast
    await broadcastRoundCommitted(updatedSession.id, {
      type: 'ROUND_COMMITTED',
      matchId: updatedSession.id,
      tableNumber: updatedSession.tableNumber,
      match: updatedSession,
    });

    return { status: 'success', data: updatedSession };
  } catch (error: any) {
    console.error('Failed in commitRoundAction:', error);
    return { status: 'error', message: error.message || 'Gagal menyimpan ronde' };
  }
}

export async function applyPenaltyAction(input: ApplyPenaltyInput) {
  return commitRoundAction({
    matchId: input.matchId,
    victimPlayerId: input.offenderPlayerId,
    actionType: 'DENDA_POIN',
    isPenalty: true,
    penaltyAmount: input.penaltyAmount,
  });
}

export async function rollbackRoundAction(matchId: string) {  try {
    const matchSession = await prisma.matchSession.findUnique({
      where: { id: matchId },
    });

    if (!matchSession) {
      return { status: 'error', message: 'Sesi pertandingan tidak ditemukan' };
    }

    const existingRounds: RoundsHistoryDocument = Array.isArray(matchSession.roundsHistory) ? (matchSession.roundsHistory as unknown as RoundsHistoryDocument) : [];
    if (existingRounds.length === 0) {
      return { status: 'error', message: 'Belum ada ronde yang dapat di-undo' };
    }

    const remainingRounds = existingRounds.slice(0, -1);
    const existingPlayers: PlayersDataDocument = Array.isArray(matchSession.playersData) ? (matchSession.playersData as unknown as PlayersDataDocument) : [];

    // Recalculate player scores from remaining rounds
    const recalculatedPlayers = existingPlayers.map((p) => {
      let score = 0;
      remainingRounds.forEach((r) => {
        const sc = r.scores?.find((s: any) => s.playerId === p.id || s.seatNumber === p.seatNumber);
        if (sc) score += sc.pointsAwarded;
      });
      return {
        ...p,
        currentScore: score,
      };
    });

    const updatedSession = await prisma.matchSession.update({
      where: { id: matchId },
      data: {
        status: 'IN_PROGRESS',
        playersData: recalculatedPlayers as unknown as Prisma.InputJsonValue,
        roundsHistory: remainingRounds as unknown as Prisma.InputJsonValue,
      },
    });

    await broadcastRoundCommitted(updatedSession.id, {
      type: 'ROUND_COMMITTED',
      matchId: updatedSession.id,
      tableNumber: updatedSession.tableNumber,
      match: updatedSession,
    });

    return { status: 'success', data: updatedSession };
  } catch (error: any) {
    console.error('Failed in rollbackRoundAction:', error);
    return { status: 'error', message: error.message || 'Gagal melakukan undo' };
  }
}

/**
 * Reset match = hapus seluruh riwayat ronde SAJA.
 * Mode, kategori, target, dan identitas pemain (nama/kursi/tim) DIPERTAHANKAN;
 * skor turunan ronde di-nol-kan sesuai invarian rekonstruksi dari roundsHistory (ADR-0001).
 */
export async function resetMatchRoundsAction(matchId: string) {
  try {
    const matchSession = await prisma.matchSession.findUnique({
      where: { id: matchId },
    });

    if (!matchSession) {
      return { status: 'error', message: 'Sesi pertandingan tidak ditemukan' };
    }

    const players: PlayersDataDocument = Array.isArray(matchSession.playersData)
      ? (matchSession.playersData as unknown as PlayersDataDocument)
      : [];

    const resetPlayers = players.map((p) => ({
      ...p,
      currentScore: 0,
      totalScore: 0,
    }));

    const updatedSession = await prisma.matchSession.update({
      where: { id: matchId },
      data: {
        status: 'IN_PROGRESS',
        winnerId: null,
        currentSet: 1,
        teamASetWins: 0,
        teamBSetWins: 0,
        playersData: resetPlayers as unknown as Prisma.InputJsonValue,
        roundsHistory: [] as unknown as Prisma.InputJsonValue,
      },
    });

    await broadcastRoundCommitted(updatedSession.id, {
      type: 'ROUND_COMMITTED',
      matchId: updatedSession.id,
      tableNumber: updatedSession.tableNumber,
      match: updatedSession,
    });

    return { status: 'success', data: updatedSession };
  } catch (error: any) {
    console.error('Failed in resetMatchRoundsAction:', error);
    return { status: 'error', message: error.message || 'Gagal melakukan reset pertandingan' };
  }
}

export async function getActiveMatchByTableId(tableId: string) {
  try {
    let table = await prisma.tableMaster.findFirst({
      where: {
        OR: [
          { id: tableId },
          { tableNumber: isNaN(Number(tableId)) ? undefined : Number(tableId) }
        ].filter(Boolean) as Prisma.TableMasterWhereInput[]
      }
    });

    if (!table) return null;

    const activeMatch = await prisma.matchSession.findFirst({
      where: {
        tableId: table.id,
        status: 'IN_PROGRESS'
      },
      orderBy: { createdAt: 'desc' }
    });

    return activeMatch;
  } catch (error) {
    console.error('Failed to fetch active match by tableId:', error);
    return null;
  }
}

/**
 * Sesi TERBARU pada meja apa pun statusnya (IN_PROGRESS / COMPLETED).
 * Dipakai route guard /play/live agar wasit tetap bisa membuka meja yang
 * barusan selesai (status COMPLETED) tanpa dilempar ke setup — devlog/0008.
 */
export async function getLatestMatchByTableId(tableId: string) {
  try {
    const table = await prisma.tableMaster.findFirst({
      where: {
        OR: [
          { id: tableId },
          { tableNumber: isNaN(Number(tableId)) ? undefined : Number(tableId) }
        ].filter(Boolean) as Prisma.TableMasterWhereInput[]
      }
    });

    if (!table) return null;

    return await prisma.matchSession.findFirst({
      where: { tableId: table.id },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Failed to fetch latest match by tableId:', error);
    return null;
  }
}

export async function setupMatchSessionAction(input: SetupMatchInput) {
  try {
    const {
      matchId,
      tableId,
      tenantCode,
      tableNumber = 1,
      rulesetMode = 'CASUAL',
      matchCategory = 'SINGLE_1V1V1V1',
      matchMode = 'ROUNDS',
      targetType = 'FIXED_ROUNDS',
      targetValue = 10,
      pointsConfig,
      rulesConfig,
      oradoConfig,
      players,
      deviceId,
    } = input;

    if (!tenantCode || !String(tenantCode).trim()) {
      return { success: false, status: 'error', message: 'Kode Penyelenggara (tenantCode) wajib diisi' };
    }

    // Find tenant
    const tenant = await prisma.tenant.findFirst({
      where: { code: { equals: tenantCode, mode: 'insensitive' } },
    });

    if (!tenant) {
      return { success: false, status: 'error', message: `Tenant with code ${tenantCode} not found` };
    }

    const effectiveTableNumber = tableNumber || (tableId && !isNaN(Number(tableId)) ? Number(tableId) : 1);

    // Look up table by tableId or tableNumber
    let table = await prisma.tableMaster.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          ...(tableId ? [{ id: tableId }] : []),
          { tableNumber: effectiveTableNumber }
        ]
      },
    });

    if (!table) {
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
      table = await prisma.tableMaster.create({
        data: {
          tenantId: tenant.id,
          tableNumber: effectiveTableNumber,
          tableName: `Meja 0${effectiveTableNumber}`,
          pinCode: generatedPin,
          status: 'IN_MATCH',
          isLocked: true,
        },
      });
    }

    // Single-device session locking: tolak hanya jika ada perangkat LAIN yang
    // membawa deviceId berbeda dari pemegang lock. Klaim lock asli terjadi
    // secara atomik saat verifikasi PIN (verifyTablePinAction).
    if (table.isLocked && table.activeDeviceId && deviceId && table.activeDeviceId !== deviceId) {
      return {
        success: false,
        status: 'error',
        message: `Meja #${table.tableNumber} sedang dikunci oleh perangkat lain. Minta panitia melepas sesi (UNLOCK) terlebih dahulu.`,
      };
    }

    const targetTableId = tableId || table.id;

    const formattedPlayers = players.map((p) => ({
      id: `p-${Date.now()}-${p.seatNumber}`,
      seatNumber: p.seatNumber,
      name: p.name.trim() || `Pemain ${p.seatNumber}`,
      teamIdentifier: matchCategory === 'TEAM_2V2' ? (p.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B') : 'NONE',
      currentScore: 0,
      totalScore: 0,
    }));

    const normMatchMode = String(matchMode).toUpperCase() as 'ROUNDS' | 'POINTS';

    // Execute atomic transaction for TableMaster status & MatchSession creation
    const matchSession = await prisma.$transaction(async (tx) => {
      // 1. Lock table master
      await tx.tableMaster.update({
        where: { id: table!.id },
        data: {
          status: 'IN_MATCH',
          isLocked: true,
        },
      });

      // 2. Find existing match session by matchId or active session on table
      let existingSession = null;
      if (matchId && matchId !== 'empty') {
        existingSession = await tx.matchSession.findUnique({
          where: { id: matchId },
        });
      }

      if (!existingSession) {
        existingSession = await tx.matchSession.findFirst({
          where: { tableId: table!.id, status: 'IN_PROGRESS' },
          orderBy: { createdAt: 'desc' },
        });
      }

      let session;
      if (existingSession) {
        session = await tx.matchSession.update({
          where: { id: existingSession.id },
          data: {
            tenantId: tenant.id,
            tableId: table!.id,
            tableNumber: table!.tableNumber,
            rulesetMode,
            matchCategory,
            matchMode: normMatchMode,
            targetType,
            targetValue,
            currentSet: 1,
            teamASetWins: 0,
            teamBSetWins: 0,
            pointsConfig: pointsConfig || undefined,
            rulesConfig: rulesConfig || { pointsConfig, oradoConfig },
            playersData: formattedPlayers as unknown as Prisma.InputJsonValue,
            roundsHistory: [] as unknown as Prisma.InputJsonValue,
            status: 'IN_PROGRESS',
          },
        });
      } else {
        session = await tx.matchSession.create({
          data: {
            tenantId: tenant.id,
            tableId: table!.id,
            tableNumber: table!.tableNumber,
            rulesetMode,
            matchCategory,
            matchMode: normMatchMode,
            targetType,
            targetValue,
            currentSet: 1,
            teamASetWins: 0,
            teamBSetWins: 0,
            pointsConfig: pointsConfig || undefined,
            rulesConfig: rulesConfig || { pointsConfig, oradoConfig },
            playersData: formattedPlayers as unknown as Prisma.InputJsonValue,
            roundsHistory: [] as unknown as Prisma.InputJsonValue,
            status: 'IN_PROGRESS',
          },
        });
      }

      return session;
    });

    const responseData = {
      ...matchSession,
      players: formattedPlayers,
      rounds: [],
    };

    return {
      success: true,
      status: 'success',
      data: responseData,
      redirectUrl: `/play/live/${targetTableId}`,
    };
  } catch (error: any) {
    console.error('Failed in setupMatchSessionAction:', error);
    return { success: false, status: 'error', message: error.message || 'Gagal melakukan setup match' };
  }
}

export async function setupMatchAction(input: SetupMatchInput) {
  return setupMatchSessionAction(input);
}

