import { IRulesetEngine, CalculationInput, CalculationResult } from './types';
import { RoundStatusTag } from '@/types/domino';

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
    } = input;

    // PORDI fixed point structure
    const pordiPoints = {
      menang_biasa: 1,
      kandang: 2,
      ceki: 2,
      palang: 4,
      tangkap: 3,
      ditangkap: -3,
      berdiri: 0,
      duduk: 0,
    };

    const roundScores: CalculationResult['roundScores'] = [];
    let winType = String(actionType);

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

        roundScores.push({
          playerId: player.id,
          seatNumber: player.seatNumber,
          statusTag,
          pointsAwarded,
          scoreAfter: player.currentScore + pointsAwarded,
        });
      });
    } else {
      players.forEach((player) => {
        let statusTag: RoundStatusTag = 'DUDUK';
        let pointsAwarded = 0;

        if (player.id === winnerPlayerId) {
          statusTag = 'MENANG';
          if (actionType === 'MENANG_BIASA') pointsAwarded = pordiPoints.menang_biasa;
          else if (actionType === 'KANDANG') pointsAwarded = pordiPoints.kandang;
          else if (actionType === 'CEKI') pointsAwarded = pordiPoints.ceki;
          else if (actionType === 'PALANG') pointsAwarded = pordiPoints.palang;
          else if (actionType === 'TANGKAP') pointsAwarded = pordiPoints.tangkap;
          else pointsAwarded = 1;
        } else if (actionType === 'KANDANG') {
          statusTag = 'BERDIRI';
          pointsAwarded = pordiPoints.berdiri;
        } else if (actionType === 'TANGKAP') {
          if (player.id === victimPlayerId) {
            statusTag = 'DITANGKAP';
            pointsAwarded = pordiPoints.ditangkap;
          } else {
            statusTag = 'DUDUK';
            pointsAwarded = pordiPoints.duduk;
          }
        } else {
          const statusChoice = String(manualStatuses[player.id] || 'DUDUK').toUpperCase();
          if (statusChoice === 'BERDIRI') {
            statusTag = 'BERDIRI';
            pointsAwarded = pordiPoints.berdiri;
          } else {
            statusTag = 'DUDUK';
            pointsAwarded = pordiPoints.duduk;
          }
        }

        roundScores.push({
          playerId: player.id,
          seatNumber: player.seatNumber,
          statusTag,
          pointsAwarded,
          scoreAfter: player.currentScore + pointsAwarded,
        });
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
