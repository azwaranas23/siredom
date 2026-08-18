import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json(
            { status: "success", message: "Database Supabase berhasil terhubung!" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Gagal terhubung ke database:", error);
        return NextResponse.json(
            {
                status: "error",
                message: "Gagal terhubung ke Supabase",
                error: error.message,
            },
            { status: 500 }
        );
    }
}