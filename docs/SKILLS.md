# Technical Skills, Command Cheat Sheet & Developer Guide - SIREDOM v0

Panduan praktis perintah CLI, *cheat sheet* utilitas, dan panduan teknis pengembang untuk pengerjaan project SIREDOM.

---

## 1. Perintah CLI Utama (Essential Commands)

### 1.1. Database & Prisma Commands
```bash
# Push skema Prisma ke database Supabase PostgreSQL
npx prisma db push

# Push skema dengan mengabaikan peringatan data loss
npx prisma db push --accept-data-loss

# Jalankan script seeder resmi (prisma/seed.ts)
npx prisma db seed

# Buka Prisma Studio GUI Browser
npx prisma studio

# Regenerate TypeScript Prisma Client
npx prisma generate
```

### 1.2. Development & Build Commands
```bash
# Jalankan server Next.js development
npm run dev

# Lakukan pengecekan tipe TypeScript (Typecheck 0 Error)
npx tsc --noEmit

# Buat build produksi Next.js
npm run build

# Jalankan server Next.js production
npm run start
```

---

## 2. Snippet Penggunaan Server Actions & Prisma

### 2.1. Memanggil Server Action dari Client Component
```tsx
'use client';
import { useTransition } from 'react';
import { createTable } from '@/app/actions/tableActions';

export function AddTableButton({ tenantCode }: { tenantCode: string }) {
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    startTransition(async () => {
      const res = await createTable(tenantCode);
      if (res.success) {
        console.log('Meja berhasil dibuat:', res.data);
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <button onClick={handleAdd} disabled={isPending}>
      {isPending ? 'Memuat...' : '+ Tambah Meja'}
    </button>
  );
}
```

### 2.2. Instance Prisma Singleton (`src/lib/prisma.ts`)
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

---

## 3. Variabel Lingkungan (`.env`)
```ini
# Transaction Pooler (Port 6543) untuk Aplikasi
DATABASE_URL="postgresql://postgres.xxx:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session Pooler (Port 5432) untuk Prisma CLI Migrasi
DIRECT_URL="postgresql://postgres.xxx:pass@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
```
