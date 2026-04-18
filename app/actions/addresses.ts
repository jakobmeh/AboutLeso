"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const AddressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional(),
  postalCode: z.string().trim().min(3).max(20),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional(),
});

const IdSchema = z.string().trim().min(1);

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  return userId;
}

export async function createAddress(formData: FormData) {
  const userId = await requireUserId();

  const parsed = AddressSchema.safeParse({
    label: formData.get("label"),
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirect("/cart?addressError=invalid");
  }

  const setDefault = formData.get("setDefault") === "on";

  await prisma.$transaction(async (tx) => {
    const currentCount = await tx.userAddress.count({
      where: { userId },
    });

    const shouldSetDefault = setDefault || currentCount === 0;
    if (shouldSetDefault) {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    await tx.userAddress.create({
      data: {
        userId,
        label: parsed.data.label || null,
        fullName: parsed.data.fullName,
        line1: parsed.data.line1,
        line2: parsed.data.line2 || null,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        country: parsed.data.country,
        phone: parsed.data.phone || null,
        isDefault: shouldSetDefault,
      },
    });
  });

  revalidatePath("/cart");
  redirect("/cart?addressSuccess=1");
}

export async function setDefaultAddress(formData: FormData) {
  const userId = await requireUserId();
  const parsedId = IdSchema.safeParse(formData.get("id"));

  if (!parsedId.success) {
    redirect("/cart?addressError=invalid");
  }

  const address = await prisma.userAddress.findFirst({
    where: { id: parsedId.data, userId },
    select: { id: true },
  });

  if (!address) {
    redirect("/cart?addressError=not_found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    await tx.userAddress.update({
      where: { id: address.id },
      data: { isDefault: true },
    });
  });

  revalidatePath("/cart");
  redirect("/cart");
}

export async function deleteAddress(formData: FormData) {
  const userId = await requireUserId();
  const parsedId = IdSchema.safeParse(formData.get("id"));

  if (!parsedId.success) {
    redirect("/cart?addressError=invalid");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.userAddress.findFirst({
      where: { id: parsedId.data, userId },
      select: { id: true, isDefault: true },
    });

    if (!existing) return;

    await tx.userAddress.delete({
      where: { id: existing.id },
    });

    if (existing.isDefault) {
      const fallback = await tx.userAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (fallback) {
        await tx.userAddress.update({
          where: { id: fallback.id },
          data: { isDefault: true },
        });
      }
    }
  });

  revalidatePath("/cart");
  redirect("/cart");
}
