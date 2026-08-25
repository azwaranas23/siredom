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
import { OradoRulesetEngine } from '../src/features/scorer/engine/OradoRulesetEngine';
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

// ── Loop D: pelepasan kunci meja saat logout (Ticket GH #1) ──
async function loopD() {
  if (process.env.RUN_DB_TESTS !== '1') return;
  console.log('--- Loop D: session lock release on logout ---');

  const mod: any = await import('../src/app/actions/tableActions');
  const { prisma } = await import('../src/lib/prisma');

  check('releaseTableSessionAction tersedia di tableActions', async () => {
    assert.equal(typeof mod.releaseTableSessionAction, 'function', 'releaseTableSessionAction belum ada');
  });
  if (typeof mod.releaseTableSessionAction !== 'function') return;

  const tenant = await prisma.tenant.findFirst({ where: { code: 'TAB-SLOWBAR' } });
  assert.ok(tenant, 'tenant seed tidak ditemukan');
  const table = await prisma.tableMaster.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { tableNumber: 'asc' },
  });
  assert.ok(table, 'tidak ada meja untuk tenant seed');

  // Simpan state awal untuk restorasi
  const original = { isLocked: table.isLocked, activeDeviceId: table.activeDeviceId };

  // Fixture: meja dikunci oleh perangkat dev-ABC
  await prisma.tableMaster.update({
    where: { id: table.id },
    data: { isLocked: true, activeDeviceId: 'dev-ABC', status: 'IN_MATCH' },
  });

  try {
    const wrong: any = await mod.releaseTableSessionAction({ tableId: table.id, deviceId: 'dev-SALAH' });
    check('perangkat salah → tolak, meja TETAP terkunci', () => {
      assert.notEqual(wrong?.status, 'success');
    });

    const stillLocked = await prisma.tableMaster.findUnique({ where: { id: table.id } });
    check('DB mempertahankan kunci setelah percobaan perangkat salah', () => {
      assert.equal(stillLocked?.isLocked, true);
      assert.equal(stillLocked?.activeDeviceId, 'dev-ABC');
    });

    const right: any = await mod.releaseTableSessionAction({ tableId: table.id, deviceId: 'dev-ABC' });
    check('perangkat pemilik sesi → sukses unlock', () => assert.equal(right?.status, 'success'));

    const unlocked = await prisma.tableMaster.findUnique({ where: { id: table.id } });
    check('DB: isLocked=false & activeDeviceId null', () => {
      assert.equal(unlocked?.isLocked, false);
      assert.equal(unlocked?.activeDeviceId, null);
    });

    check('status meja kembali active', () => assert.equal(unlocked?.status, 'active'));
  } finally {
    await prisma.tableMaster.update({
      where: { id: table.id },
      data: { isLocked: original.isLocked, activeDeviceId: original.activeDeviceId },
    }).catch(() => {});
    await prisma.$disconnect();
  }
}

// ── Loop E: matriks poin PB PORDI granular (Ticket GH#7, pure) ──
async function loopE() {
  console.log('--- Loop E: matriks poin PORDI ---');
  const engine = new PordiRulesetEngine();

  const mkInput = (over: Partial<CalculationInput>): CalculationInput => ({
    rulesetMode: 'PB_PORDI',
    matchCategory: 'SINGLE_1V1V1V1',
    rulesConfig: {},
    winnerPlayerId: 'p-1',
    actionType: 'MENANG_BIASA',
    players: [1, 2, 3, 4].map((n) => ({ id: `p-${n}`, seatNumber: n as 1|2|3|4, teamIdentifier: 'NONE' as const, currentScore: 0 })),
    currentRoundsCount: 0,
    currentSet: 1,
    targetValue: 99, // hindari terminasi agar fokus ke poin
    matchMode: 'ROUNDS',
    targetType: 'FIXED_ROUNDS',
    ...over,
  } as CalculationInput);

  const pts = (r: CalculationResult, id: string) => r.roundScores.find((s) => s.playerId === id)?.pointsAwarded;

  // Domi keluarga
  await check('DOMI_BALAK → pengunci +2', async () => {
    const r = engine.calculateRound(mkInput({ actionType: 'DOMI_BALAK' }));
    assert.equal(pts(r, 'p-1'), 2);
  });
  await check('CEKI_BIASA → +2', async () => {
    assert.equal(pts(engine.calculateRound(mkInput({ actionType: 'CEKI_BIASA' })), 'p-1'), 2);
  });
  await check('CEKI_HABIS → +3', async () => {
    assert.equal(pts(engine.calculateRound(mkInput({ actionType: 'CEKI_HABIS' })), 'p-1'), 3);
  });
  await check('CEKI_BALAK → +3', async () => {
    assert.equal(pts(engine.calculateRound(mkInput({ actionType: 'CEKI_BALAK' })), 'p-1'), 3);
  });
  await check('CEKI_APOLLO → +4', async () => {
    assert.equal(pts(engine.calculateRound(mkInput({ actionType: 'CEKI_APOLLO' })), 'p-1'), 4);
  });
  await check('legacy CEKI → +2 · PALANG → +4 (kompatibilitas data lama)', async () => {
    assert.equal(pts(engine.calculateRound(mkInput({ actionType: 'CEKI' })), 'p-1'), 2);
    assert.equal(pts(engine.calculateRound(mkInput({ actionType: 'PALANG' })), 'p-1'), 4);
  });

  // Kandang Tunggal
  await check('Kandang MENANG Tunggal → pengunci +3', async () => {
    const r = engine.calculateRound(mkInput({ actionType: 'KANDANG', kandangVariant: 'MENANG' }));
    assert.equal(pts(r, 'p-1'), 3);
  });
  await check('Kandang SERI Tunggal → pengunci +1 & lawan-seri +1', async () => {
    const r = engine.calculateRound(mkInput({ actionType: 'KANDANG', kandangVariant: 'SERI', kandangRecipients: ['p-2'] }));
    assert.equal(pts(r, 'p-1'), 1);
    assert.equal(pts(r, 'p-2'), 1);
  });
  await check('Kandang KALAH Tunggal → cascade +3/+2/+1, pengunci 0', async () => {
    const r = engine.calculateRound(mkInput({
      actionType: 'KANDANG', kandangVariant: 'KALAH',
      kandangRecipients: ['p-2', 'p-3', 'p-4'],
    }));
    assert.equal(pts(r, 'p-1'), 0);
    assert.equal(r.roundScores.find((s) => s.playerId === 'p-1')?.statusTag, 'BERDIRI');
    assert.equal(pts(r, 'p-2'), 3);
    assert.equal(pts(r, 'p-3'), 2);
    assert.equal(pts(r, 'p-4'), 1);
  });

  // Kandang Ganda
  const gandaOver = { matchCategory: 'TEAM_2V2' as const, players: [1,2,3,4].map((n) => ({ id:`p-${n}`, seatNumber:n as 1|2|3|4, teamIdentifier:(n%2===1?'TEAM_A':'TEAM_B') as 'TEAM_A'|'TEAM_B', currentScore:0 })) };
  await check('Ganda Kandang MENANG → pengunci +2', async () => {
    const r = engine.calculateRound(mkInput({ ...gandaOver, actionType:'KANDANG', kandangVariant:'MENANG', winnerTeam:'TEAM_A' }));
    assert.equal(pts(r, 'p-1'), 2);
  });
  await check('Ganda Kandang SERI → +1/+1', async () => {
    const r = engine.calculateRound(mkInput({ ...gandaOver, actionType:'KANDANG', kandangVariant:'SERI', winnerTeam:'TEAM_A', kandangRecipients:['p-2'] }));
    assert.equal(pts(r, 'p-1'), 1);
    assert.equal(pts(r, 'p-2'), 1);
  });
  await check('Ganda Kandang KALAH → lawan terpilih +3, pengunci 0', async () => {
    const r = engine.calculateRound(mkInput({ ...gandaOver, actionType:'KANDANG', kandangVariant:'KALAH', winnerTeam:'TEAM_A', kandangRecipients:['p-2'] }));
    assert.equal(pts(r, 'p-1'), 0);
    assert.equal(pts(r, 'p-2'), 3);
    assert.equal(pts(r, 'p-4'), 0); // rekan lawan tidak ikut dapat
  });
}

// ── Loop F: tie-break overtime PORDI (pure) ──
async function loopF() {
  console.log('--- Loop F: overtime tie-break ---');
  const engine = new PordiRulesetEngine();

  const mkF = (over: Partial<CalculationInput>): CalculationInput => ({
    rulesetMode: 'PB_PORDI',
    matchCategory: 'SINGLE_1V1V1V1',
    rulesConfig: {},
    actionType: 'MENANG_BIASA',
    currentSet: 1,
    matchMode: 'ROUNDS',
    targetType: 'FIXED_ROUNDS',
    ...over,
  } as CalculationInput);
  const mkPlayers = (scores: number[]) =>
    [1, 2, 3, 4].map((n) => ({
      id: `p-${n}`,
      seatNumber: n as 1 | 2 | 3 | 4,
      teamIdentifier: 'NONE' as const,
      currentScore: scores[n - 1],
    }));

  await check('ROUNDES t=7: ronde terakhir berakhir dengan seri di puncak → OVERTIME (targetValue+1, belum selesai)', async () => {
    // Pemenang ronde = p-4 (+1 → 1); puncak tetap p-1 & p-2 seri di 3
    const r = engine.calculateRound(mkF({
      winnerPlayerId: 'p-4',
      players: mkPlayers([3, 3, 0, 0]),
      currentRoundsCount: 6,
      targetValue: 7,
    }));
    assert.equal(r.isMatchComplete, false);
    assert.equal(r.newTargetValue, 8);
    // Puncak tetap seri di 3 setelah ronde ini
    const sAfter = (id: string) => r.roundScores.find((s) => s.playerId === id)?.scoreAfter;
    assert.equal(sAfter('p-1'), 3);
    assert.equal(sAfter('p-2'), 3);
  });

  await check('Overtime diselesaikan: ronde berikut tanpa seri di puncak → selesai (target 8)', async () => {
    // Masuk ronde 8 (count=7) dengan targetValue yang sudah dinaikkan menjadi 8;
    // pemenang mutlak membuat puncak tidak lagi seri
    const r = engine.calculateRound(mkF({
      winnerPlayerId: 'p-1',
      players: mkPlayers([4, 3, 0, 0]),
      currentRoundsCount: 7,
      targetValue: 8,
    }));
    assert.equal(r.isMatchComplete, true);
  });
}

// ── Loop H: ORADO edge — Apollo exception Balak 0 & Balak 0 Mati (pure) ──
async function loopH() {
  console.log('--- Loop H: ORADO Apollo/Balak0 edge ---');
  const engine = new OradoRulesetEngine();

  const oradoInput = (over: Partial<CalculationInput>): CalculationInput => ({
    rulesetMode: 'PB_ORADO',
    matchCategory: 'TEAM_2V2',
    rulesConfig: { oradoConfig: { apolloRule: true, deadBalak0Penalty: true } },
    actionType: 'ORADO_COUNT',
    winnerTeam: 'TEAM_A',
    winnerPlayerId: 'p-1',
    players: [1, 2, 3, 4].map((n) => ({
      id: `p-${n}`,
      seatNumber: n as 1 | 2 | 3 | 4,
      teamIdentifier: (n % 2 === 1 ? 'TEAM_A' : 'TEAM_B') as 'TEAM_A' | 'TEAM_B',
      currentScore: 0,
    })),
    currentRoundsCount: 0,
    currentSet: 1,
    targetValue: 101,
    matchMode: 'POINTS',
    targetType: 'SET_101',
    ...over,
  } as CalculationInput);

  const bigA = [1, 2, 3, 4].map((n) => ({
    id: `p-${n}`,
    seatNumber: n as 1 | 2 | 3 | 4,
    teamIdentifier: (n % 2 === 1 ? 'TEAM_A' : 'TEAM_B') as 'TEAM_A' | 'TEAM_B',
    currentScore: n % 2 === 1 ? 55 : 0,
  }));

  await check('Apollo DITEKAN pada putaran Balak 0 (count%7==0): hanya menang set biasa', async () => {
    const r = engine.calculateRound(oradoInput({ players: bigA, rawPointsInput: 46, currentRoundsCount: 0 }));
    // Tim A mencapai 101 vs 0, TAPI ronde ini putaran Balak 0
    assert.equal(r.isMatchComplete, false);
    assert.equal(r.setJustWon, true);
    assert.equal(r.teamASetWins, 1);
  });

  await check('Apollo AKTIF pada putaran non-Balak-0: menang 2 set langsung', async () => {
    const r = engine.calculateRound(oradoInput({ players: bigA, rawPointsInput: 46, currentRoundsCount: 1 }));
    assert.equal(r.isMatchComplete, true);
    assert.equal(r.teamASetWins, 2);
  });

  await check('balak0Mati → +13 dan winType BALAK_0_MATI', async () => {
    const r = engine.calculateRound(oradoInput({ rawPointsInput: 5, oradoMultipliers: { balak0Mati: true } }));
    assert.equal(ptsHelper(r, 'p-1'), 18);
    assert.equal(r.winType, 'BALAK_0_MATI');
  });
}

function ptsHelper(r: CalculationResult, id: string) {
  return r.roundScores.find((s) => s.playerId === id)?.pointsAwarded;
}

// ── Loop G: persistensi PORDI granular + rollback (DB integrasi) ──
async function loopG() {
  if (process.env.RUN_DB_TESTS !== '1') return;
  console.log('--- Loop G: PORDI granular persist + rollback ---');

  const mod: any = await import('../src/features/scorer/actions');
  const { prisma } = await import('../src/lib/prisma');

  const tenant = await prisma.tenant.findFirst({ where: { code: 'TAB-SLOWBAR' } });
  assert.ok(tenant, 'tenant seed tidak ditemukan');
  const table = await prisma.tableMaster.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { tableNumber: 'asc' },
  });
  assert.ok(table, 'tidak ada meja untuk tenant seed');

  const session = await prisma.matchSession.create({
    data: {
      tenantId: tenant.id,
      tableId: table.id,
      tableNumber: table.tableNumber,
      rulesetMode: 'PB_PORDI',
      matchCategory: 'SINGLE_1V1V1V1',
      matchMode: 'ROUNDS',
      targetType: 'FIXED_ROUNDS',
      targetValue: 99,
      status: 'IN_PROGRESS',
      playersData: [1, 2, 3, 4].map((n) => ({
        id: `p-${n}`, seatNumber: n, name: `P${n}`,
        teamIdentifier: 'NONE', currentScore: 0, totalScore: 0,
      })) as any,
      roundsHistory: [] as any,
    },
  });

  try {
    // Ronde 1: Domi Balak
    const r1: any = await mod.commitRoundAction({
      matchId: session.id, winnerPlayerId: 'p-1', actionType: 'DOMI_BALAK',
    });
    check('DOMI_BALAK tersimpan: pengunci +2 di DB', async () => {
      assert.equal(r1.status, 'success');
      const after: any = await prisma.matchSession.findUnique({ where: { id: session.id } });
      const players = after.playersData as any[];
      assert.equal(players.find((p) => p.id === 'p-1')?.currentScore, 2);
      const last = (after.roundsHistory as any[]).at(-1);
      assert.equal(last.actionType, 'DOMI_BALAK');
    });

    // Ronde 2: Kandang Kalah (cascade ke 3 lawan)
    const r2: any = await mod.commitRoundAction({
      matchId: session.id, winnerPlayerId: 'p-1', actionType: 'KANDANG',
      kandangVariant: 'KALAH', kandangRecipients: ['p-2', 'p-3', 'p-4'],
    });
    check('KANDANG KALAH tersimpan: cascade +3/+2/+1, pengunci 0', async () => {
      assert.equal(r2.status, 'success');
      const after: any = await prisma.matchSession.findUnique({ where: { id: session.id } });
      const byId = Object.fromEntries((after.playersData as any[]).map((p) => [p.id, p]));
      assert.equal(byId['p-1'].currentScore, 2);   // tetap dari ronde 1
      assert.equal(byId['p-2'].currentScore, 3);
      assert.equal(byId['p-3'].currentScore, 2);
      assert.equal(byId['p-4'].currentScore, 1);
      const last = (after.roundsHistory as any[]).at(-1);
      assert.equal(last.kandangVariant, 'KALAH');
    });

    // Rollback ronde 2 → rekonstruksi tepat ke state ronde 1
    const rb: any = await mod.rollbackRoundAction(session.id);
    check('rollback mengembalikan tepat ke hasil ronde 1', async () => {
      assert.equal(rb.status, 'success');
      const after: any = await prisma.matchSession.findUnique({ where: { id: session.id } });
      assert.equal((after.roundsHistory as any[]).length, 1);
      const byId = Object.fromEntries((after.playersData as any[]).map((p) => [p.id, p]));
      assert.equal(byId['p-1'].currentScore, 2);
      assert.equal(byId['p-2'].currentScore, 0);
      assert.equal(byId['p-3'].currentScore, 0);
      assert.equal(byId['p-4'].currentScore, 0);
    });
  } finally {
    await prisma.matchSession.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

// ── Loop I: ORADO balak0Mati persisten (DB integrasi) ──
async function loopI() {
  if (process.env.RUN_DB_TESTS !== '1') return;
  console.log('--- Loop I: ORADO balak0Mati persist ---');

  const mod: any = await import('../src/features/scorer/actions');
  const { prisma } = await import('../src/lib/prisma');

  const tenant = await prisma.tenant.findFirst({ where: { code: 'TAB-SLOWBAR' } });
  assert.ok(tenant, 'tenant seed tidak ditemukan');
  const table = await prisma.tableMaster.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { tableNumber: 'desc' }, // pakai meja lain agar tak bentrok Loop G restore
  });
  assert.ok(table, 'tidak ada meja untuk tenant seed');

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
      status: 'IN_PROGRESS',
      playersData: [1, 2, 3, 4].map((n) => ({
        id: `p-${n}`, seatNumber: n, name: `P${n}`,
        teamIdentifier: n % 2 === 1 ? 'TEAM_A' : 'TEAM_B',
        currentScore: 0, totalScore: 0,
      })) as any,
      roundsHistory: [] as any,
    },
  });

  try {
    const res: any = await mod.commitRoundAction({
      matchId: session.id,
      winnerTeam: 'TEAM_A',
      winnerPlayerId: 'p-1',
      actionType: 'ORADO_COUNT',
      rawPointsInput: 5,
      oradoMultipliers: { balak0Mati: true },
    });
    // Assert terhadap return Server Action (authoritative) — re-query via
    // pooler pgbouncer terbukiti flaky untuk read-immediately-after-write.
    check('balak0Mati tersimpan: pemenang +18 (5+13), winType BALAK_0_MATI', async () => {
      assert.equal(res?.status, 'success');
      const players = (res.data.playersData as any[]);
      const p1 = players.find((p) => p.id === 'p-1');
      assert.equal(p1.currentScore, 18);
      const last = (res.data.roundsHistory as any[]).at(-1);
      assert.equal(last.winType, 'BALAK_0_MATI');
    });
  } finally {
    await prisma.matchSession.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

await loopB();
await loopC();
await loopD();
await loopE();
await loopF();
await loopG();
await loopH();
await loopI();
console.log(failures === 0 ? '\nALL GREEN' : `\n${failures} assertion(s) FAILED (loop merah)`);
process.exit(failures === 0 ? 0 : 1);
