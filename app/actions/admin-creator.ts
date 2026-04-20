"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { Role } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function ensureAdmin() {
  await requireRole([Role.ADMIN]);
}

export async function searchCreatorUser(formData: FormData) {
  await ensureAdmin();
  const email = ((formData.get("email") as string) ?? "").trim();
  redirect(`/admin?section=creators&lookup=${encodeURIComponent(email)}`);
}

export async function assignCreatorCode(formData: FormData) {
  await ensureAdmin();
  const userId = ((formData.get("userId") as string) ?? "").trim();
  const code = ((formData.get("code") as string) ?? "").trim().toUpperCase();
  const discountPercent = parseInt((formData.get("discountPercent") as string) ?? "0", 10);
  const commissionPercent = parseInt((formData.get("commissionPercent") as string) ?? "0", 10);
  const expiresAtRaw = ((formData.get("expiresAt") as string) ?? "").trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  if (
    !userId ||
    !code ||
    !/^[A-Z0-9_-]{2,20}$/.test(code) ||
    isNaN(discountPercent) ||
    isNaN(commissionPercent) ||
    discountPercent < 0 ||
    discountPercent > 80 ||
    commissionPercent < 0 ||
    commissionPercent > 50 ||
    (expiresAt && isNaN(expiresAt.getTime()))
  ) {
    redirect("/admin?section=creators&error=invalid");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: Role.CREATOR },
      });
      await tx.creatorCode.upsert({
        where: { userId },
        create: { code, userId, discountPercent, commissionPercent, expiresAt },
        update: { code, discountPercent, commissionPercent, isActive: true, expiresAt },
      });
    });
  } catch {
    redirect("/admin?section=creators&error=code_taken");
  }

  revalidatePath("/admin");
  redirect("/admin?section=creators&success=1");
}

export async function deactivateCreatorCode(formData: FormData) {
  await ensureAdmin();
  const userId = ((formData.get("userId") as string) ?? "").trim();

  await prisma.creatorCode.update({
    where: { userId },
    data: { isActive: false },
  });

  revalidatePath("/admin");
  redirect("/admin?section=creators");
}

export async function revokeCreatorCode(formData: FormData) {
  await ensureAdmin();
  const userId = ((formData.get("userId") as string) ?? "").trim();

  await prisma.$transaction(async (tx) => {
    await tx.creatorCode.update({
      where: { userId },
      data: { isActive: false },
    });
    await tx.user.update({
      where: { id: userId },
      data: { role: Role.USER },
    });
  });

  revalidatePath("/admin");
  redirect("/admin?section=creators");
}
