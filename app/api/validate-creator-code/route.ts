import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false });

  const record = await prisma.creatorCode.findUnique({
    where: { code, isActive: true },
    select: { discountPercent: true, expiresAt: true },
  });

  if (!record) return NextResponse.json({ valid: false });

  if (record.expiresAt && record.expiresAt < new Date()) {
    await prisma.creatorCode.update({ where: { code }, data: { isActive: false } });
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true, discountPercent: record.discountPercent });
}
