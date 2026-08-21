import { IRulesetEngine, CalculationInput, CalculationResult } from './types';
import { RoundStatusTag, TeamIdentifier } from '@/types/domino';

export class OradoRulesetEngine implements IRulesetEngine {
  calculateRound(input: CalculationInput): CalculationResult {
    const {
      winnerPlayerId,
      winnerTeam = 'NONE',
      actionType,
      rawPointsInput = 0,
      oradoMultipliers = {},
      players,
      rulesConfig,
      isPenalty,
      penaltyAmount = 1,
      victimPlayerId,
    } = input;

    let totalAwarded = Number(rawPointsInput) || 0;

    if (oradoMultipliers.duaUjung || oradoMultipliers.macetBeradu) {
      totalAwarded *= 2;
    }
    if (oradoMultipliers.balakHabis) {
      totalAwarded += 50;
    }

    const roundScores: CalculationResult['roundScores'] = [];

    if (isPenalty || actionType === 'DENDA_POIN') {
      const offenderId = victimPlayerId || winnerPlayerId;
      const offenderPlayer = players.find((p) => p.id === offenderId);
      const offenderTeam = offenderPlayer?.teamIdentifier || (offenderPlayer ? (offenderPlayer.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B') : 'NONE');
      const targetTeam: TeamIdentifier = offenderTeam === 'TEAM_A' ? 'TEAM_B' : offenderTeam === 'TEAM_B' ? 'TEAM_A' : 'NONE';

      players.forEach((player) => {
        const playerTeam = player.teamIdentifier || (player.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B');
        let statusTag: RoundStatusTag = 'DUDUK';
        let pointsAwarded = 0;

        if (player.id === offenderId) {
          statusTag = 'DENDA';
          pointsAwarded = 0;
        } else if (playerTeam === targetTeam) {
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
        const playerTeam = player.teamIdentifier || (player.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B');
        const isWinnerTeam = playerTeam === winnerTeam || player.id === winnerPlayerId;
        let statusTag: RoundStatusTag = 'DUDUK';
        let pointsAwarded = 0;

        if (isWinnerTeam) {
          statusTag = 'MENANG';
          pointsAwarded = player.id === winnerPlayerId ? totalAwarded : 0;
        } else {
          statusTag = 'BERDIRI';
          pointsAwarded = 0;
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

    const teamAScore = roundScores
      .filter((s) => s.seatNumber === 1 || s.seatNumber === 3)
      .reduce((sum, s) => sum + s.scoreAfter, 0);

    const teamBScore = roundScores
      .filter((s) => s.seatNumber === 2 || s.seatNumber === 4)
      .reduce((sum, s) => sum + s.scoreAfter, 0);

    const apolloRuleActive = rulesConfig?.oradoConfig?.apolloRule ?? true;
    let currentSet = input.currentSet || 1;
    let teamASetWins = input.teamASetWins || 0;
    let teamBSetWins = input.teamBSetWins || 0;
    let isMatchComplete = false;

    let setWinner: 'TEAM_A' | 'TEAM_B' | null = null;
    if (teamAScore >= 101) setWinner = 'TEAM_A';
    else if (teamBScore >= 101) setWinner = 'TEAM_B';

    const isApollo = apolloRuleActive && (
      (teamAScore >= 101 && teamBScore === 0) ||
      (teamBScore >= 101 && teamAScore === 0)
    );

    if (isApollo) {
      isMatchComplete = true;
      if (setWinner === 'TEAM_A') teamASetWins += 2;
      else teamBSetWins += 2;
    } else if (setWinner) {
      if (setWinner === 'TEAM_A') teamASetWins += 1;
      if (setWinner === 'TEAM_B') teamBSetWins += 1;

      if (teamASetWins >= 2 || teamBSetWins >= 2 || currentSet >= 3) {
        isMatchComplete = true;
      }
    }

    const winTypeStr = oradoMultipliers.balakHabis
      ? 'BALAK_HABIS'
      : oradoMultipliers.duaUjung
      ? 'DUA_UJUNG'
      : oradoMultipliers.macetBeradu
      ? 'BATU_MACET'
      : isPenalty
      ? 'DENDA_POIN'
      : 'ORADO_COUNT';

    return {
      roundScores,
      winType: winTypeStr,
      isPenalty: Boolean(isPenalty || actionType === 'DENDA_POIN'),
      isMatchComplete,
      currentSet,
      teamASetWins,
      teamBSetWins,
    };
  }
}
