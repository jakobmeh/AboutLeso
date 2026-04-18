"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { Role } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function setTrackingNumber(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const orderId = formData.get("orderId") as string;
  const trackingNumber = ((formData.get("trackingNumber") as string) ?? "").trim() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: { trackingNumber },
  });

  revalidatePath("/admin");
  revalidatePath("/orders");
}

export async function setOrderStatus(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const orderId = formData.get("orderId") as string;
  const status = formData.get("status") as "PENDING" | "CONFIRMED" | "CANCELLED";

  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath("/admin");
  revalidatePath("/orders");
}
