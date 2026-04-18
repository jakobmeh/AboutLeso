"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(productId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
  } else {
    await prisma.wishlist.create({ data: { userId, productId } });
  }

  revalidatePath("/products");
  revalidatePath("/wishlist");
}

export async function getWishlistIds(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });
  type WishlistItem = (typeof items)[0];
  return items.map((w: WishlistItem) => w.productId);
}
