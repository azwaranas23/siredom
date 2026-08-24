// Test harness to diagnose game continuation bugs in SIREDOM
// Run with: npx tsx scripts/test-games-completion.ts

import { CasualRulesetEngine } from '../src/features/scorer/engine/CasualRulesetEngine';
import { PordiRulesetEngine } from '../src/features/scorer/engine/PordiRulesetEngine';
import { OradoRulesetEngine } from '../src/features/scorer/engine/OradoRulesetEngine';

interface TestPlayer {
  id: string;
  seatNumber: number;
  currentScore: number;
}

function testCasualModeFixedRounds() {
  console.log('\n=== Test: Casual Mode Fixed 7 Rounds ===');
  const engine = new CasualRulesetEngine();
  let rounds = 0;
  
  for (let i = 0; i < 7; i++) {
    rounds++;
    const result = engine.calculateRound({
      rulesetMode: 'CASUAL',
      matchCategory: 'SINGLE_1V1V1V1',
      matchMode: 'rounds',
      targetType: 'FIXED_ROUNDS',
      targetValue: 7,
      currentRoundsCount: rounds,
      currentSet: 1,
      players: [
        { id: 'p1', seatNumber: 1, currentScore: i * 1 },
        { id: 'p2', seatNumber: 2, currentScore: i * 1 },
        { id: 'p3', seatNumber: 3, currentScore: i * 1 },
        { id: 'p4', seatNumber: 4, currentScore: i * 1 },
      ],
      winnerPlayerId: 'p1',
      actionType: 'MENANG_BIASA',
    });
    
    console.log(`Round ${rounds}: isMatchComplete=${result.isMatchComplete}, isTargetReached (via rounds)=${rounds >= 7}`);
    
    if (i === 6 && !result.isMatchComplete) {
      console.log('❌ BUG: Round 7 completed but isMatchComplete=false');
    }
  }
}

function testCasualModeRaceToPoint() {
  console.log('\n=== Test: Casual Mode Race to 50 Points ===');
  const engine = new CasualRulesetEngine();
  let highestScore = 0;
  
  for (let i = 1; i <= 60; i++) {
    const result = engine.calculateRound({
      rulesetMode: 'CASUAL',
      matchCategory: 'SINGLE_1V1V1V1',
      matchMode: 'points',
      targetType: 'RACE_TO_POINTS',
      targetValue: 50,
      currentRoundsCount: i,
      currentSet: 1,
      players: [
        { id: 'p1', seatNumber: 1, currentScore: highestScore },
        { id: 'p2', seatNumber: 2, currentScore: 10 },
        { id: 'p3', seatNumber: 3, currentScore: 15 },
        { id: 'p4', seatNumber: 4, currentScore: 20 },
      ],
      winnerPlayerId: 'p1',
      actionType: 'MENANG_BIASA',
    });
    
    const targetReachedCheck = highestScore >= 50 || result.roundScores[0].scoreAfter >= 50;
    console.log(`Round ${i}: Highest score after round=${Math.max(...result.roundScores.map(r => r.scoreAfter))}, isMatchComplete=${result.isMatchComplete}, Expected target reached at 50`);
    
    if (highestScore >= 50) break;
    highestScore = result.roundScores[0].scoreAfter;
    
    if (i === 55 && !result.isMatchComplete) {
      console.log('❌ BUG: Player reached 50+ points but isMatchComplete=false');
    }
  }
}

function testKandangAutoStatus() {
  console.log('\n=== Test: Kandang Auto-assign 3 Players to BERDIRI ===');
  const engine = new CasualRulesetEngine();
  
  const result = engine.calculateRound({
    rulesetMode: 'CASUAL',
    matchCategory: 'SINGLE_1V1V1V1',
    matchMode: 'rounds',
    targetType: 'FIXED_ROUNDS',
    targetValue: 10,
    currentRoundsCount: 1,
    currentSet: 1,
    players: [
      { id: 'p1', seatNumber: 1, currentScore: 0 },
      { id: 'p2', seatNumber: 2, currentScore: 0 },
      { id: 'p3', seatNumber: 3, currentScore: 0 },
      { id: 'p4', seatNumber: 4, currentScore: 0 },
    ],
    winnerPlayerId: 'p1',
    actionType: 'KANDANG',
  });
  
  console.log('Player statuses for Kandang action:');
  result.roundScores.forEach(s => {
    console.log(`  ${s.playerId}: ${s.statusTag}`, s.pointsAwarded === 0 ? '(BERDIRI - correct)' : '');
  });
  
  const standingCount = result.roundScores.filter(s => s.statusTag === 'BERDIRI').length;
  const winnerCount = result.roundScores.filter(s => s.statusTag === 'MENANG').length;
  
  if (standingCount !== 3) {
    console.log(`❌ BUG: Expected 3 BERDIRI but got ${standingCount}`);
  }
  if (winnerCount !== 1) {
    console.log(`❌ BUG: Expected 1 MENANG but got ${winnerCount}`);
  }
}

function testPordiFixedRounds() {
  console.log('\n=== Test: PB PORDI Fixed 7 Rounds (Single) ===');
  const engine = new PordiRulesetEngine();
  
  for (let round = 1; round <= 7; round++) {
    const result = engine.calculateRound({
      rulesetMode: 'PB_PORDI',
      matchCategory: 'SINGLE_1V1V1V1',
      matchMode: 'rounds',
      targetType: 'FIXED_ROUNDS',
      targetValue: 7,
      currentRoundsCount: round,
      currentSet: 1,
      players: [
        { id: 'p1', seatNumber: 1, currentScore: round - 1 },
        { id: 'p2', seatNumber: 2, currentScore: round - 1 },
        { id: 'p3', seatNumber: 3, currentScore: round - 1 },
        { id: 'p4', seatNumber: 4, currentScore: round - 1 },
      ],
      winnerPlayerId: 'p1',
      actionType: 'MENANG_BIASA',
    });
    
    const shouldComplete = round >= 7 && result.roundScores[0].scoreAfter > 
      result.roundScores.slice(1).map(r => r.scoreAfter).reduce((a, b) => Math.max(a, b), 0);
    
    console.log(`Round ${round}: Winner score=${result.roundScores[0].scoreAfter}, isMatchComplete=${result.isMatchComplete}, Should complete=${shouldComplete}`);
  }
}

function testPordiRaceTo7Points() {
  console.log('\n=== Test: PB PORDI Race to 7 Points (Team) ===');
  const engine = new PordiRulesetEngine();
  
  let p1Score = 0, p2Score = 0, p3Score = 0, p4Score = 0;
  
  for (let round = 1; round <= 10; round++) {
    const result = engine.calculateRound({
      rulesetMode: 'PB_PORDI',
      matchCategory: 'TEAM_2V2',
      matchMode: 'points',
      targetType: 'RACE_TO_POINTS',
      targetValue: 7,
      currentRoundsCount: round,
      currentSet: 1,
      players: [
        { id: 'p1', seatNumber: 1, currentScore: p1Score, teamIdentifier: 'TEAM_A' },
        { id: 'p2', seatNumber: 2, currentScore: p2Score, teamIdentifier: 'TEAM_B' },
        { id: 'p3', seatNumber: 3, currentScore: p3Score, teamIdentifier: 'TEAM_A' },
        { id: 'p4', seatNumber: 4, currentScore: p4Score, teamIdentifier: 'TEAM_B' },
      ],
      winnerPlayerId: 'p1', // Team A wins
      actionType: 'MENANG_BIASA',
    });
    
    const teamAScore = result.roundScores.filter(s => s.seatNumber === 1 || s.seatNumber === 3)
      .reduce((sum, s) => sum + s.scoreAfter, 0);
    const teamBScore = result.roundScores.filter(s => s.seatNumber === 2 || s.seatNumber === 4)
      .reduce((sum, s) => sum + s.scoreAfter, 0);
    
    p1Score = result.roundScores.find(s => s.playerId === 'p1')?.scoreAfter || 0;
    p2Score = result.roundScores.find(s => s.playerId === 'p2')?.scoreAfter || 0;
    p3Score = result.roundScores.find(s => s.playerId === 'p3')?.scoreAfter || 0;
    p4Score = result.roundScores.find(s => s.playerId === 'p4')?.scoreAfter || 0;
    
    console.log(`Round ${round}: TeamA=${teamAScore}/${teamBScore}, isMatchComplete=${result.isMatchComplete}`);
    
    if (teamAScore >= 7 && !result.isMatchComplete) {
      console.log('❌ BUG: Team A reached 7 points but isMatchComplete=false');
    }
    
    if (teamAScore >= 7 || teamBScore >= 7) break;
  }
}

function testOradoSetTermination() {
  console.log('\n=== Test: PB ORADO Set Termination at 101 Points ===');
  const engine = new OradoRulesetEngine();

  // Simulate team A winning set 1 by reaching 101 points
  const result1 = engine.calculateRound({
    rulesetMode: 'PB_ORADO',
    matchCategory: 'TEAM_2V2',
    matchMode: 'points',
    targetType: 'SET_101',
    targetValue: 101,
    currentRoundsCount: 10,
    currentSet: 1,
    players: [
      { id: 'p1', seatNumber: 1, currentScore: 50, teamIdentifier: 'TEAM_A' },
      { id: 'p2', seatNumber: 2, currentScore: 30, teamIdentifier: 'TEAM_B' },
      { id: 'p3', seatNumber: 3, currentScore: 50, teamIdentifier: 'TEAM_A' },
      { id: 'p4', seatNumber: 4, currentScore: 30, teamIdentifier: 'TEAM_B' },
    ],
    winnerTeam: 'TEAM_A',
    winnerPlayerId: 'p1',
    actionType: 'ORADO_COUNT',
    rawPointsInput: 5,
  });

  console.log(`Set 1 result: isMatchComplete=${result1.isMatchComplete}, currentSet=${result1.currentSet}, teamASetWins=${result1.teamASetWins}, teamBSetWins=${result1.teamBSetWins}, setJustWon=${result1.setJustWon}`);

  if (result1.isMatchComplete) {
    console.log('❌ BUG: Match completed after only 1 set won');
  } else if (!result1.setJustWon) {
    console.log('❌ BUG: Set just won flag not set');
  }

  // Simulate team A winning set 2 (should complete the match)
  const result2 = engine.calculateRound({
    rulesetMode: 'PB_ORADO',
    matchCategory: 'TEAM_2V2',
    matchMode: 'points',
    targetType: 'SET_101',
    targetValue: 101,
    currentRoundsCount: 20,
    currentSet: result1.currentSet || 2,
    players: [
      { id: 'p1', seatNumber: 1, currentScore: 50, teamIdentifier: 'TEAM_A' },
      { id: 'p2', seatNumber: 2, currentScore: 30, teamIdentifier: 'TEAM_B' },
      { id: 'p3', seatNumber: 3, currentScore: 50, teamIdentifier: 'TEAM_A' },
      { id: 'p4', seatNumber: 4, currentScore: 30, teamIdentifier: 'TEAM_B' },
    ],
    winnerTeam: 'TEAM_A',
    winnerPlayerId: 'p1',
    actionType: 'ORADO_COUNT',
    rawPointsInput: 5,
    teamASetWins: 1,
    teamBSetWins: 0,
  });

  console.log(`Set 2 result: isMatchComplete=${result2.isMatchComplete}, currentSet=${result2.currentSet}, teamASetWins=${result2.teamASetWins}, teamBSetWins=${result2.teamBSetWins}`);

  if (!result2.isMatchComplete) {
    console.log('❌ BUG: Match should complete when team wins 2 sets');
  }
}

// Run all tests
console.log('=== SIREDOM Game Continuation Bug Tests ===');
testCasualModeFixedRounds();
testCasualModeRaceToPoint();
testKandangAutoStatus();
testPordiFixedRounds();
testPordiRaceTo7Points();
testOradoSetTermination();
console.log('\n=== Tests Complete ===');