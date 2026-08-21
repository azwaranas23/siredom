import { RulesetMode, MatchCategory, ActionType, RoundStatusTag, TeamIdentifier, PointsConfig, RulesConfig } from '@/types/domino';

export interface CalculationPlayerInput {
  id: string;
  seatNumber: number;
  teamIdentifier?: TeamIdentifier;
  currentScore: number;
}

export interface CalculationInput {
  rulesetMode: RulesetMode;
  matchCategory: MatchCategory;
  rulesConfig?: RulesConfig | any;
  pointsConfig?: PointsConfig;
  winnerPlayerId?: string | null;
  winnerTeam?: TeamIdentifier;
  actionType: ActionType;
  victimPlayerId?: string | null;
  manualStatuses?: Record<string, RoundStatusTag | string>;
  rawPointsInput?: number;
  oradoMultipliers?: {
    duaUjung?: boolean;
    balakHabis?: boolean;
    macetBeradu?: boolean;
  };
  isPenalty?: boolean;
  penaltyAmount?: number;
  players: CalculationPlayerInput[];
  currentRoundsCount: number;
  currentSet: number;
  targetValue: number;
  matchMode: 'ROUNDS' | 'POINTS' | 'rounds' | 'points';
  targetType: string;
  teamASetWins?: number;
  teamBSetWins?: number;
}

export interface CalculationResult {
  roundScores: {
    playerId: string;
    seatNumber?: number;
    statusTag: RoundStatusTag;
    pointsAwarded: number;
    scoreAfter: number;
  }[];
  winType: string;
  isPenalty: boolean;
  isMatchComplete: boolean;
  newTargetValue?: number;
  currentSet?: number;
  teamASetWins?: number;
  teamBSetWins?: number;
}

export interface IRulesetEngine {
  calculateRound(input: CalculationInput): CalculationResult;
}
