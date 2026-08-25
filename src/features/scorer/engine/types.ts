import { RulesetMode, MatchCategory, ActionType, RoundStatusTag, TeamIdentifier, PointsConfig, RulesConfig, KandangVariant } from '@/types/domino';

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
     balak0Mati?: boolean;
   };
   isPenalty?: boolean;
   penaltyAmount?: number;
   /** Ticket GH#7 — sub-jenis Kandang PORDI (dipilih wasit di Level-2 modal). */
   kandangVariant?: KandangVariant;
   /** Urutan penerima poin untuk Kandang: [0] terbesar. SERI: [0]=lawan seri. */
   kandangRecipients?: string[];
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
  setJustWon?: boolean; // true when a team reaches 101 but match not over yet
  newTargetValue?: number;
  currentSet?: number;
  teamASetWins?: number;
  teamBSetWins?: number;
}

export interface IRulesetEngine {
  calculateRound(input: CalculationInput): CalculationResult;
}
