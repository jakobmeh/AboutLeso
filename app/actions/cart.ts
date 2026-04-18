"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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

async function getOrCreateCartId(userId: string) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });

  return cart.id;
}

export async function addToCart(formData: FormData) {
  const userId = await requireUserId();
  const productIdParsed = z.string().cuid().safeParse(formData.get("productId"));
  const quantityParsed = z.coerce.number().int().min(1).max(99).safeParse(formData.get("quantity") ?? "1");

  if (!productIdParsed.success || !quantityParsed.success) {
    throw new Error("Invalid cart input.");
  }

  const product = await prisma.product.findUnique({
    where: { id: productIdParsed.data },
    select: { id: true, stock: true, isActive: true },
  });

  if (!product || !product.isActive || product.stock <= 0) {
    throw new Error("Product is not available.");
  }

  const cartId = await getOrCreateCartId(userId);
  const quantityToAdd = quantityParsed.data;

  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId,
        productId: product.id,
      },
    },
    select: { id: true, quantity: true },
  });

  const cappedQuantity = existing
    ? Math.min(existing.quantity + quantityToAdd, product.stock)
    : Math.min(quantityToAdd, product.stock);

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: cappedQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        productId: product.id,
        quantity: cappedQuantity,
      },
    });
  }

  revalidatePath("/products");
  revalidatePath("/cart");
}

export async function updateCartItemQuantity(formData: FormData) {
  const userId = await requireUserId();
  const itemIdParsed = z.string().cuid().safeParse(formData.get("itemId"));
  const quantityParsed = z.coerce.number().int().min(0).max(99).safeParse(formData.get("quantity"));

  if (!itemIdParsed.success || !quantityParsed.success) {
    throw new Error("Invalid cart update input.");
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: itemIdParsed.data },
    select: {
      id: true,
      quantity: true,
      cart: { select: { userId: true } },
      product: { select: { stock: true } },
    },
  });

  if (!item || item.cart.userId !== userId) {
    throw new Error("Cart item not found.");
  }

  if (quantityParsed.data === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    const capped = Math.min(quantityParsed.data, item.product.stock);
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: capped },
    });
  }

  revalidatePath("/cart");
  revalidatePath("/products");
}

export async function removeCartItem(formData: FormData) {
  const userId = await requireUserId();
  const itemIdParsed = z.string().cuid().safeParse(formData.get("itemId"));

  if (!itemIdParsed.success) {
    throw new Error("Invalid item id.");
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: itemIdParsed.data },
    select: { id: true, cart: { select: { userId: true } } },
  });

  if (!item || item.cart.userId !== userId) {
    throw new Error("Cart item not found.");
  }

  await prisma.cartItem.delete({ where: { id: item.id } });

  revalidatePath("/cart");
  revalidatePath("/products");
}
