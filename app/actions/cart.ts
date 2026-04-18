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
  const variantIdParsed = z.string().min(1).safeParse(formData.get("variantId"));
  const quantityParsed = z.coerce.number().int().min(1).max(99).safeParse(formData.get("quantity") ?? "1");

  if (!variantIdParsed.success || !quantityParsed.success) {
    throw new Error("Invalid cart input.");
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantIdParsed.data },
    select: {
      id: true,
      stock: true,
      isActive: true,
      product: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!variant || !variant.isActive || !variant.product.isActive || variant.stock <= 0) {
    throw new Error("Product is not available.");
  }

  const cartId = await getOrCreateCartId(userId);
  const quantityToAdd = quantityParsed.data;

  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_variantId: {
        cartId,
        variantId: variant.id,
      },
    },
    select: { id: true, quantity: true },
  });

  const cappedQuantity = existing
    ? Math.min(existing.quantity + quantityToAdd, variant.stock)
    : Math.min(quantityToAdd, variant.stock);

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: cappedQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        variantId: variant.id,
        quantity: cappedQuantity,
      },
    });
  }

  revalidatePath("/products");
  revalidatePath("/cart");
}

export async function updateCartItemQuantity(formData: FormData) {
  const userId = await requireUserId();
  const itemIdParsed = z.string().min(1).safeParse(formData.get("itemId"));
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
      variant: { select: { stock: true } },
    },
  });

  if (!item || item.cart.userId !== userId) {
    throw new Error("Cart item not found.");
  }

  if (quantityParsed.data === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    const capped = Math.min(quantityParsed.data, item.variant.stock);
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: capped },
    });
  }

  revalidatePath("/cart");
  revalidatePath("/products");
}

export async function changeCartItemVariant(formData: FormData) {
  const userId = await requireUserId();
  const itemIdParsed = z.string().min(1).safeParse(formData.get("itemId"));
  const newVariantIdParsed = z.string().min(1).safeParse(formData.get("newVariantId"));

  if (!itemIdParsed.success || !newVariantIdParsed.success) {
    throw new Error("Invalid input.");
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: itemIdParsed.data },
    select: {
      id: true, quantity: true,
      cart: { select: { id: true, userId: true } },
      variant: { select: { product: { select: { id: true } } } },
    },
  });

  if (!item || item.cart.userId !== userId) throw new Error("Cart item not found.");

  const newVariant = await prisma.productVariant.findUnique({
    where: { id: newVariantIdParsed.data },
    select: { id: true, stock: true, isActive: true, productId: true },
  });

  if (!newVariant || !newVariant.isActive || newVariant.productId !== item.variant.product.id) {
    throw new Error("Variant not available.");
  }

  // If new variant already in cart, merge and delete old item
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: item.cart.id, variantId: newVariant.id } },
    select: { id: true, quantity: true },
  });

  if (existing) {
    const merged = Math.min(existing.quantity + item.quantity, newVariant.stock);
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: merged } });
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    const capped = Math.min(item.quantity, newVariant.stock);
    await prisma.cartItem.update({ where: { id: item.id }, data: { variantId: newVariant.id, quantity: capped } });
  }

  revalidatePath("/cart");
}

export async function removeCartItem(formData: FormData) {
  const userId = await requireUserId();
  const itemIdParsed = z.string().min(1).safeParse(formData.get("itemId"));

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
