/**
 * Feedback loop untuk devlog/0005+0006.
 *
 * Loop A (murni, tanpa I/O): terminasi off-by-one di engine PORDI/Casual mode ROUNDS.
 *   RED = isMatchComplete false saat commit ronde TERAKHIR sesuai target.
 * Loop B (integrasi DB, guard RUN_DB_TESTS=1): resetMatchRoundsAction harus ada,
 *   mengosongkan roundsHistory, nol-kan skor turunan, dan MEMPERTAHANKAN mode/kategori/target.
 *
 * Jalankan:
 *   npx tsx scripts/test-round-bugs.mts            (Loop A saja)
 *   RUN_DB_TESTS=1 npx tsx scripts/test-round-bugs.mts   (Loop A + B)
 */
import assert from 'node:assert/strict';
import { PordiRulesetEngine } from '../src/features/scorer/engine/PordiRulesetEngine';
import { CasualRulesetEngine } from '../src/features/scorer/engine/CasualRulesetEngine';
import type { CalculationInput } from '../src/features/scorer/engine/types';

let failures = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err: any) {
    failures++;
    console.log(`FAIL  ${name}\n      ${err?.message?.split('\n')[0]}`);
  }
}

const basePlayers = (scores: number[] = [0, 0, 0, 0]) =>
  [1, 2, 3, 4].map((seat, i) => ({
    id: `p-${seat}`,
    seatNumber: seat as 1 | 2 | 3 | 4,
    teamIdentifier: 'NONE' as const,
    currentScore: scores[i],
  }));

const teamPlayers = (aScore = 0, bScore = 0) =>
  [1, 2, 3, 4].map((seat) => ({
    id: `p-${seat}`,
    seatNumber: seat as 1 | 2 | 3 | 4,
    teamIdentifier: (seat % 2 === 1 ? 'TEAM_A' : 'TEAM_B') as 'TEAM_A' | 'TEAM_B',
    currentScore: seat % 2 === 1 ? aScore : bScore,
  }));

function pordiInput(over: Partial<CalculationInput>): CalculationInput {
  return {
    rulesetMode: 'PB_PORDI',
    matchCategory: 'SINGLE_1V1V1V1',
    rulesConfig: {},
    winnerPlayerId: 'p-1',
    winnerTeam: 'NONE',
    actionType: 'MENANG_BIASA',
    players: basePlayers(),
    currentRoundsCount: 0,
    currentSet: 1,
    targetValue: 7,
    matchMode: 'ROUNDS',
    targetType: 'FIXED_ROUNDS',
    ...over,
  } as CalculationInput;
}

// ── Loop A: terminasi ROUNDS harus tepat di ronde target ────────────────
console.log('--- Loop A: engine termination (pure) ---');

await check('PORDI ROUNDS t=7: commit ronde-6 (count=5) BELUM selesai', () => {
  const r = new PordiRulesetEngine().calculateRound(pordiInput({ currentRoundsCount: 5 }));
  assert.equal(r.isMatchComplete, false);
});

await check('PORDI ROUNDS t=7: commit ronde-7 (count=6) HARUS selesai', () => {
  const r = new PordiRulesetEngine().calculateRound(pordiInput({ currentRoundsCount: 6 }));
  assert.equal(r.isMatchComplete, true);
});

await check('CASUAL ROUNDS t=10: commit ronde-9 (count=8) BELUM selesai', () => {
  const r = new CasualRulesetEngine().calculateRound(
    pordiInput({ rulesetMode: 'CASUAL', targetValue: 10, currentRoundsCount: 8 })
  );
  assert.equal(r.isMatchComplete, false);
});

await check('CASUAL ROUNDS t=10: commit ronde-10 (count=9) HARUS selesai', () => {
  const r = new CasualRulesetEngine().calculateRound(
    pordiInput({ rulesetMode: 'CASUAL', targetValue: 10, currentRoundsCount: 9 })
  );
  assert.equal(r.isMatchComplete, true);
});

// Sanity hijau: jalur berbasis POIN memang sudah benar sebelum fix
await check('sanity CASUAL POINTS single t=50: skor menyentuh 50 saat commit → selesai', () => {
  const r = new CasualRulesetEngine().calculateRound(
    pordiInput({
      rulesetMode: 'CASUAL',
      matchMode: 'POINTS',
      targetType: 'RACE_TO_POINTS',
      targetValue: 50,
      players: basePlayers([49, 0, 0, 0]),
    })
  );
  assert.equal(r.isMatchComplete, true);
});

await check('sanity PORDI TEAM POINTS race-7: tim A capai 7 saat commit → selesai', () => {
  const r = new PordiRulesetEngine().calculateRound(
    pordiInput({
      matchCategory: 'TEAM_2V2',
      matchMode: 'POINTS',
      targetType: 'RACE_TO_POINTS',
      targetValue: 7,
      players: teamPlayers(3, 0),
    })
  );
  assert.equal(r.isMatchComplete, true);
});

// ── Loop B: reset-match-only persisten ke DB ────────────────────────────
async function loopB() {
  console.log('--- Loop B: resetMatchRoundsAction ---');
  const mod: any = await import('../src/features/scorer/actions').catch(() => null);

  check('resetMatchRoundsAction tersedia di features/scorer/actions', async () => {
    assert.ok(mod, 'modul actions gagal dimuat');
    assert.equal(typeof mod.resetMatchRoundsAction, 'function', 'resetMatchRoundsAction belum ada');
  });

  if (!mod || typeof mod.resetMatchRoundsAction !== 'function' || process.env.RUN_DB_TESTS !== '1') {
    return;
  }

  const { prisma } = await import('../src/lib/prisma');
  const tenant = await prisma.tenant.findFirst({ where: { code: 'TAB-SLOWBAR' } });
  assert.ok(tenant, 'tenant seed TAB-SLOWBAR tidak ditemukan');
  const table = await prisma.tableMaster.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { tableNumber: 'asc' },
  });
  assert.ok(table, 'tidak ada meja untuk tenant seed');

  // Fixture: satu sesi dengan 1 ronde tersimpan + skor pemain non-nol
  const session = await prisma.matchSession.create({
    data: {
      tenantId: tenant.id,
      tableId: table.id,
      tableNumber: table.tableNumber,
      rulesetMode: 'PB_PORDI',
      matchCategory: 'SINGLE_1V1V1V1',
      matchMode: 'ROUNDS',
      targetType: 'FIXED_ROUNDS',
      targetValue: 7,
      status: 'COMPLETED',
      winnerId: 'p-1',
      playersData: [
        { id: 'p-1', seatNumber: 1, name: 'A', teamIdentifier: 'NONE', currentScore: 3, totalScore: 3 },
        { id: 'p-2', seatNumber: 2, name: 'B', teamIdentifier: 'NONE', currentScore: 1, totalScore: 1 },
        { id: 'p-3', seatNumber: 3, name: 'C', teamIdentifier: 'NONE', currentScore: 0, totalScore: 0 },
        { id: 'p-4', seatNumber: 4, name: 'D', teamIdentifier: 'NONE', currentScore: 0, totalScore: 0 },
      ] as any,
      roundsHistory: [
        {
          id: 'rnd-fix-1',
          setNumber: 1,
          roundNumber: 1,
          actionType: 'MENANG_BIASA',
          winnerPlayerId: 'p-1',
          winType: 'MENANG_BIASA',
          timestamp: new Date().toISOString(),
          scores: [
            { playerId: 'p-1', seatNumber: 1, statusTag: 'MENANG', pointsAwarded: 3, scoreAfter: 3 },
            { playerId: 'p-2', seatNumber: 2, statusTag: 'DUDUK', pointsAwarded: 0, scoreAfter: 1 },
            { playerId: 'p-3', seatNumber: 3, statusTag: 'BERDIRI', pointsAwarded: 0, scoreAfter: 0 },
            { playerId: 'p-4', seatNumber: 4, statusTag: 'BERDIRI', pointsAwarded: 0, scoreAfter: 0 },
          ],
        },
      ] as any,
    },
  });

  try {
    const res: any = await mod.resetMatchRoundsAction(session.id);
    check('resetMatchRoundsAction sukses', () => assert.equal(res.status, 'success'));

    const after: any = await prisma.matchSession.findUnique({ where: { id: session.id } });
    const players = after.playersData as any[];

    check('roundsHistory dikosongkan', () => assert.equal((after.roundsHistory as any[]).length, 0));
    check('status kembali IN_PROGRESS', () => assert.equal(after.status, 'IN_PROGRESS'));
    check('winnerId dibersihkan', () => assert.equal(after.winnerId, null));
    check('skor turunan ronde di-nol-kan (invariant rekonstruksi)', () =>
      players.forEach((p) => {
        assert.equal(p.currentScore, 0, `currentScore ${p.id} != 0`);
        assert.equal(p.totalScore ?? 0, 0, `totalScore ${p.id} != 0`);
      })
    );
    check('MODE/kategori/target PEMAIN dipertahankan', () => {
      assert.equal(after.rulesetMode, 'PB_PORDI');
      assert.equal(after.matchCategory, 'SINGLE_1V1V1V1');
      assert.equal(after.targetValue, 7);
      assert.equal(players.length, 4);
      assert.equal(players[0].name, 'A'); // identitas pemain utuh
      assert.deepEqual(players.map((p) => p.seatNumber), [1, 2, 3, 4]);
    });
  } finally {
    await prisma.matchSession.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

// ── Loop C: transisi set ORADO persisten (setJustWon → skor diarsipkan & reset) ──
async function loopC() {
  if (process.env.RUN_DB_TESTS !== '1') return;
  console.log('--- Loop C: transisi set ORADO ---');

  const mod: any = await import('../src/features/scorer/actions');
  const { prisma } = await import('../src/lib/prisma');
  assert.equal(typeof mod.commitRoundAction, 'function', 'commitRoundAction tidak tersedia');

  const tenant = await prisma.tenant.findFirst({ where: { code: 'TAB-SLOWBAR' } });
  assert.ok(tenant, 'tenant seed tidak ditemukan');
  const table = await prisma.tableMaster.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { tableNumber: 'asc' },
  });
  assert.ok(table, 'tidak ada meja untuk tenant seed');

  // Fixture: Set 1 mendekati akhir — Tim A (kursi 1&3) = 95, Tim B = 5.
  // Ronde berikut: Tim A menang +10 → 105 ≥ 101, lawan ≠ 0 → setJustWon TANPA Apollo.
  const session = await prisma.matchSession.create({
    data: {
      tenantId: tenant.id,
      tableId: table.id,
      tableNumber: table.tableNumber,
      rulesetMode: 'PB_ORADO',
      matchCategory: 'TEAM_2V2',
      matchMode: 'POINTS',
      targetType: 'SET_101',
      targetValue: 101,
      currentSet: 1,
      status: 'IN_PROGRESS',
      playersData: [
        { id: 'p-1', seatNumber: 1, name: 'A', teamIdentifier: 'TEAM_A', currentScore: 50, totalScore: 0 },
        { id: 'p-2', seatNumber: 2, name: 'B', teamIdentifier: 'TEAM_B', currentScore: 3, totalScore: 0 },
        { id: 'p-3', seatNumber: 3, name: 'C', teamIdentifier: 'TEAM_A', currentScore: 45, totalScore: 0 },
        { id: 'p-4', seatNumber: 4, name: 'D', teamIdentifier: 'TEAM_B', currentScore: 2, totalScore: 0 },
      ] as any,
      roundsHistory: [] as any,
    },
  });

  try {
    const res: any = await mod.commitRoundAction({
      matchId: session.id,
      winnerTeam: 'TEAM_A',
      winnerPlayerId: 'p-1',
      actionType: 'ORADO_COUNT',
      rawPointsInput: 10,
    });
    check('commitRoundAction sukses (ORADO set point)', () => assert.equal(res.status, 'success'));

    const after: any = await prisma.matchSession.findUnique({ where: { id: session.id } });
    const players = after.playersData as any[];
    const byId = Object.fromEntries(players.map((p) => [p.id, p]));

    check('setJustWon → maju ke Set 2, match BELUM selesai', () => {
      assert.equal(after.currentSet, 2);
      assert.equal(after.status, 'IN_PROGRESS');
    });

    check('skor set diarsipkan: currentScore semua pemain kembali 0', () =>
      players.forEach((p) => assert.equal(p.currentScore, 0, `currentScore ${p.id} != 0`))
    );

    check('totalScore mengarsipkan hasil set (p1=60, p2=3)', () => {
      assert.equal(byId['p-1'].totalScore, 60);
      assert.equal(byId['p-2'].totalScore, 3);
    });

    check('konfigurasi ORADO tetap utuh', () => {
      assert.equal(after.rulesetMode, 'PB_ORADO');
      assert.equal(after.targetValue, 101);
    });
  } finally {
    await prisma.matchSession.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

await loopB();
await loopC();

console.log(failures === 0 ? '\nALL GREEN' : `\n${failures} assertion(s) FAILED (loop merah)`);
process.exit(failures === 0 ? 0 : 1);
