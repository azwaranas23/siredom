import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SIREDOM Comprehensive Database Seeding...');

  // 1. Clean existing records in relational order
  await prisma.matchSession.deleteMany({});
  await prisma.tableMaster.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // Generate secure Bcrypt password hash
  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  // 2. Create Super Admin User
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin SIREDOM',
      email: 'superadmin@siredom.com',
      passwordHash: defaultPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`🔒 Super Admin created: ${superAdmin.email}`);

  // 3. Create Primary Tenant: Tab Slowbar Coffee
  const tenantTabSlowbar = await prisma.tenant.create({
    data: {
      name: 'Tab Slowbar Coffee',
      slug: 'tab-slowbar-coffee',
      code: 'TAB-SLOWBAR',
      adminEmail: 'admin@tabslowbar.com',
      adminPasswordHash: defaultPasswordHash,
      subscriptionPlan: 'pro',
      status: 'active',
      maxTables: 10,
    },
  });
  console.log(`✅ Tenant created: ${tenantTabSlowbar.name} (${tenantTabSlowbar.code})`);

  // 4. Create Cafe Admin User
  const cafeAdmin = await prisma.user.create({
    data: {
      tenantId: tenantTabSlowbar.id,
      name: 'Admin Tab Slowbar Coffee',
      email: 'admin@tabslowbar.com',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`🔒 Cafe Admin created: ${cafeAdmin.email}`);

  // 5. Create Master Table #1
  const table1 = await prisma.tableMaster.create({
    data: {
      tenantId: tenantTabSlowbar.id,
      tableNumber: 1,
      tableName: 'Meja Utama 01',
      pinCode: '1234',
      status: 'active',
    },
  });
  console.log(`✅ Master Table created: ${table1.tableName} (PIN: ${table1.pinCode})`);

  const initialPlayers = [
    { id: `p-seed-1`, seatNumber: 1, name: 'Maman', teamIdentifier: 'NONE', currentScore: 0, totalScore: 0 },
    { id: `p-seed-2`, seatNumber: 2, name: 'Topati', teamIdentifier: 'NONE', currentScore: 0, totalScore: 0 },
    { id: `p-seed-3`, seatNumber: 3, name: 'Fatir', teamIdentifier: 'NONE', currentScore: 0, totalScore: 0 },
    { id: `p-seed-4`, seatNumber: 4, name: 'Yusril', teamIdentifier: 'NONE', currentScore: 0, totalScore: 0 },
  ];

  // 6. Create Initial Active Match Session for Table #1
  const initialMatch = await prisma.matchSession.create({
    data: {
      tenantId: tenantTabSlowbar.id,
      tableId: table1.id,
      tableNumber: 1,
      matchMode: 'ROUNDS',
      targetValue: 10,
      status: 'IN_PROGRESS',
      pointsConfig: {
        menangBiasa: 1,
        kandang: 2,
        ceki: 3,
        palang: 4,
        tangkap: 3,
      },
      playersData: initialPlayers as any,
      roundsHistory: [] as any,
    },
  });

  console.log(`🎮 Initial Match Session created for ${table1.tableName} with 4 players:`);
  initialPlayers.forEach((p) => {
    console.log(`   - Seat ${p.seatNumber}: ${p.name} (Score: ${p.currentScore})`);
  });

  console.log('🎉 Full JSON Document-Relational database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
