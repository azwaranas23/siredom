import { IRulesetEngine, CalculationInput, CalculationResult } from './types';
import { RoundStatusTag } from '@/types/domino';

/**
 * PB PORDI Ruleset Engine (devlog/0010, Ticket GH#7)
 *
 * Matriks poin (Tunggal / Ganda identik, kecuali Kandang):
 *   MENANG_BIASA +1 · DOMI_BALAK +2
 *   CEKI_BIASA|CEKI +2 · CEKI_HABIS +3 · CEKI_BALAK +3 · CEKI_APOLLO|PALANG +4
 *   TANGKAP +3 / korban −3
 *
 * Kandang — sub-jenis dipilih wasit (pemain memberi tahu), tanpa input angka:
 *   MENANG: pengunci +3 (Tunggal) / +2 (Ganda)
 *   SERI  : pengunci +1 dan lawan-seri +1 (kandangRecipients[0])
 *   KALAH : pengunci 0;
 *           Tunggal → kandangRecipients urut: +3, +2, +1
 *           Ganda   → kandangRecipients[0]: +3
 */
export class PordiRulesetEngine implements IRulesetEngine {
  calculateRound(input: CalculationInput): CalculationResult {
    const {
      winnerPlayerId,
      actionType,
      victimPlayerId,
      manualStatuses = {},
      isPenalty,
      penaltyAmount = 1,
      players,
      currentRoundsCount,
      targetValue = 7,
      matchMode,
      matchCategory,
      kandangVariant,
      kandangRecipients = [],
    } = input;

    const pordiPoints: Record<string, number> = {
      MENANG_BIASA: 1,
      DOMI_BALAK: 2,
      CEKI_BIASA: 2,
      CEKI: 2, // legacy alias Ceki Biasa
      CEKI_HABIS: 3,
      CEKI_BALAK: 3,
      CEKI_APOLLO: 4,
      PALANG: 4, // legacy alias Apollo
      TANGKAP: 3,
    };

    const roundScores: CalculationResult['roundScores'] = [];
    let winType = String(actionType);

    const pushScore = (
      playerId: string,
      seatNumber: number | undefined,
      statusTag: RoundStatusTag,
      pointsAwarded: number,
      prevScore: number
    ) => {
      roundScores.push({
        playerId,
        seatNumber,
        statusTag,
        pointsAwarded,
        scoreAfter: prevScore + pointsAwarded,
      });
    };

    if (isPenalty || actionType === 'DENDA_POIN') {
      winType = 'DENDA_POIN';
      const offenderId = victimPlayerId || winnerPlayerId;
      const offenderPlayer = players.find((p) => p.id === offenderId);
      const isTeam = matchCategory === 'TEAM_2V2';
      const offenderTeam = offenderPlayer?.teamIdentifier || (offenderPlayer ? (offenderPlayer.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B') : 'NONE');
      const targetTeam = offenderTeam === 'TEAM_A' ? 'TEAM_B' : offenderTeam === 'TEAM_B' ? 'TEAM_A' : 'NONE';

      players.forEach((player) => {
        let statusTag: RoundStatusTag = 'DUDUK';
        let pointsAwarded = 0;

        if (player.id === offenderId) {
          statusTag = 'DENDA';
          pointsAwarded = 0;
        } else if (isTeam) {
          const playerTeam = player.teamIdentifier || (player.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B');
          if (playerTeam === targetTeam) {
            statusTag = 'MENANG';
            pointsAwarded = penaltyAmount;
          }
        } else {
          statusTag = 'MENANG';
          pointsAwarded = penaltyAmount;
        }

        pushScore(player.id, player.seatNumber, statusTag, pointsAwarded, player.currentScore);
      });
    } else if (actionType === 'KANDANG' && kandangVariant) {
      // ── Kandang 3 kondisi (devlog/0010) ──────────────────────────────
      const recipients = new Set(kandangRecipients.filter(Boolean));
      // MENANG: +3 Tunggal / +2 Ganda · SERI: pengunci hanya +1 · KALAH: pengunci 0
      let lockPoint = matchCategory === 'TEAM_2V2' ? 2 : 3;
      if (kandangVariant === 'SERI') lockPoint = 1;

      players.forEach((player) => {
        let statusTag: RoundStatusTag = 'DUDUK';
        let pointsAwarded = 0;

        if (player.id === winnerPlayerId) {
          // Pengunci: menang/seri dapat poin; kalah nol.
          statusTag = kandangVariant === 'KALAH' ? 'BERDIRI' : 'MENANG';
          pointsAwarded = kandangVariant === 'KALAH' ? 0 : lockPoint;
        } else if (recipients.has(player.id)) {
          // Penerima poin lawan (urutan taps): SERI [0]=+1; KALAH Tunggal +3/+2/+1; KALAH Ganda +3.
          statusTag = 'MENANG';
          if (kandangVariant === 'SERI') pointsAwarded = 1;
          else if (matchCategory === 'TEAM_2V2') pointsAwarded = 3;
          else pointsAwarded = kandangRecipients.indexOf(player.id) === 0 ? 3 : kandangRecipients.indexOf(player.id) === 1 ? 2 : 1;
        }

        pushScore(player.id, player.seatNumber, statusTag, pointsAwarded, player.currentScore);
      });
    } else {
      // ── Domi Biasa / Balak / Ceki variants / Tangkap ─────────────────
      players.forEach((player) => {
        let statusTag: RoundStatusTag = 'DUDUK';
        let pointsAwarded = 0;

        if (player.id === winnerPlayerId) {
          statusTag = 'MENANG';
          pointsAwarded = pordiPoints[actionType] ?? 1;
        } else if (actionType === 'TANGKAP') {
          if (player.id === victimPlayerId) {
            statusTag = 'DITANGKAP';
            pointsAwarded = -3;
          } else {
            statusTag = 'DUDUK';
            pointsAwarded = 0;
          }
        } else {
          const statusChoice = String(manualStatuses[player.id] || 'DUDUK').toUpperCase();
          statusTag = statusChoice === 'BERDIRI' ? 'BERDIRI' : 'DUDUK';
        }

        pushScore(player.id, player.seatNumber, statusTag, pointsAwarded, player.currentScore);
      });
    }

    const nextRoundsCount = currentRoundsCount + 1;
    const isModeRounds = String(matchMode).toUpperCase() === 'ROUNDS';
    const isTeamCategory = matchCategory === 'TEAM_2V2';

    const sortedByScore = [...roundScores].sort((a, b) => b.scoreAfter - a.scoreAfter);
    const isRank1Tied =
      sortedByScore.length >= 2 &&
      sortedByScore[0].scoreAfter > 0 &&
      sortedByScore[0].scoreAfter === sortedByScore[1].scoreAfter;

    let isTargetReached = false;
    if (isModeRounds) {
      // Off-by-one fix (devlog/0006): target tercapai tepat saat ronde terakhir di-commit.
      isTargetReached = nextRoundsCount >= targetValue;
    } else if (isTeamCategory) {
      const teamAScore = roundScores
        .filter((s) => s.seatNumber === 1 || s.seatNumber === 3)
        .reduce((sum, s) => sum + s.scoreAfter, 0);
      const teamBScore = roundScores
        .filter((s) => s.seatNumber === 2 || s.seatNumber === 4)
        .reduce((sum, s) => sum + s.scoreAfter, 0);
      isTargetReached = teamAScore >= targetValue || teamBScore >= targetValue;
    } else {
      isTargetReached = roundScores.some((s) => s.scoreAfter >= targetValue);
    }

    const isMatchComplete = isTargetReached && !isRank1Tied;
    const newTargetValue = isTargetReached && isRank1Tied ? targetValue + 1 : targetValue;

    return {
      roundScores,
      winType,
      isPenalty: Boolean(isPenalty || actionType === 'DENDA_POIN'),
      isMatchComplete,
      newTargetValue,
    };
  }
}
