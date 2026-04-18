"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { Role } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function setTrackingNumber(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const orderId = formData.get("orderId") as string;
  const trackingNumber = ((formData.get("trackingNumber") as string) ?? "").trim() || null;

  await prisma.order.update({ where: { id: orderId }, data: { trackingNumber } });

  revalidatePath("/admin");
  revalidatePath("/orders");
}

export async function setOrderStatus(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const orderId = formData.get("orderId") as string;
  const status = formData.get("status") as "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

  await prisma.order.update({ where: { id: orderId }, data: { status } });

  revalidatePath("/admin");
  revalidatePath("/orders");
}

export async function cancelOrder(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orderId = formData.get("orderId") as string;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!order || order.status !== "PENDING") return;

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });

  revalidatePath("/orders");
}
