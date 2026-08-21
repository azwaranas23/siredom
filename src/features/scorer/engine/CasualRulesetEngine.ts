import { IRulesetEngine, CalculationInput, CalculationResult } from './types';
import { RoundStatusTag } from '@/types/domino';

export class CasualRulesetEngine implements IRulesetEngine {
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
      targetValue,
      matchMode,
      rulesConfig,
      pointsConfig: passedPointsConfig,
    } = input;

    const pointsConfig = passedPointsConfig || rulesConfig?.pointsConfig || {
      menang_biasa: 1,
      kandang: 2,
      ceki: 3,
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
      const isTeam = input.matchCategory === 'TEAM_2V2';
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
          if (actionType === 'MENANG_BIASA') pointsAwarded = pointsConfig.menang_biasa ?? 1;
          else if (actionType === 'KANDANG') pointsAwarded = pointsConfig.kandang ?? 2;
          else if (actionType === 'CEKI') pointsAwarded = pointsConfig.ceki ?? 3;
          else if (actionType === 'PALANG') pointsAwarded = pointsConfig.palang ?? 4;
          else if (actionType === 'TANGKAP') pointsAwarded = pointsConfig.tangkap ?? 3;
          else pointsAwarded = 1;
        } else if (actionType === 'KANDANG') {
          statusTag = 'BERDIRI';
          pointsAwarded = pointsConfig.berdiri ?? 0;
        } else if (actionType === 'TANGKAP') {
          if (player.id === victimPlayerId) {
            statusTag = 'DITANGKAP';
            pointsAwarded = pointsConfig.ditangkap ?? -3;
          } else {
            statusTag = 'DUDUK';
            pointsAwarded = pointsConfig.duduk ?? 0;
          }
        } else {
          const statusChoice = String(manualStatuses[player.id] || 'DUDUK').toUpperCase();
          if (statusChoice === 'BERDIRI') {
            statusTag = 'BERDIRI';
            pointsAwarded = pointsConfig.berdiri ?? 0;
          } else {
            statusTag = 'DUDUK';
            pointsAwarded = pointsConfig.duduk ?? 0;
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
    const isTeamCategory = input.matchCategory === 'TEAM_2V2';

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
