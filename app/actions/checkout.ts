"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  return userId;
}

export async function checkoutFromCart(formData: FormData) {
  const userId = await requireUserId();
  const codeInput = ((formData.get("creatorCode") as string) ?? "").trim().toUpperCase();

  const orderId = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                priceCents: true,
                stock: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty.");
    }

    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new Error(`Product ${item.product.name} is inactive.`);
      }
      if (item.product.stock < item.quantity) {
        throw new Error(`Not enough stock for ${item.product.name}.`);
      }
    }

    type CartItemType = (typeof cart.items)[number];
    const subtotalCents = cart.items.reduce(
      (sum: number, item: CartItemType) => sum + item.product.priceCents * item.quantity,
      0
    );

    let creatorCodeRecord = null;
    if (codeInput) {
      creatorCodeRecord = await tx.creatorCode.findUnique({
        where: { code: codeInput, isActive: true },
      });
    }

    const discountCents = creatorCodeRecord
      ? Math.floor((subtotalCents * creatorCodeRecord.discountPercent) / 100)
      : 0;
    const totalCents = subtotalCents - discountCents;
    const commissionCents = creatorCodeRecord
      ? Math.floor((totalCents * creatorCodeRecord.commissionPercent) / 100)
      : 0;

    const order = await tx.order.create({
      data: {
        userId,
        status: "CONFIRMED",
        subtotalCents,
        discountCents,
        totalCents,
        creatorCodeId: creatorCodeRecord?.id ?? null,
        commissionCents,
      },
      select: { id: true },
    });

    await tx.orderItem.createMany({
      data: cart.items.map((item: CartItemType) => ({
        orderId: order.id,
        productId: item.product.id,
        productName: item.product.name,
        unitPriceCents: item.product.priceCents,
        quantity: item.quantity,
        lineTotalCents: item.product.priceCents * item.quantity,
      })),
    });

    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.product.id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return order.id;
  });

  revalidatePath("/products");
  revalidatePath("/cart");
  revalidatePath("/orders");
  revalidatePath("/admin");
  revalidatePath("/creator");

  redirect(`/orders?success=1&orderId=${orderId}`);
}
