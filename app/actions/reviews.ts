"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function submitReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const productId = formData.get("productId") as string;
  const rating = parseInt(formData.get("rating") as string);
  const body = ((formData.get("body") as string) ?? "").trim() || null;

  if (!productId || !rating || rating < 1 || rating > 5) return;

  await prisma.review.upsert({
    where: { userId_productId: { userId, productId } },
    update: { rating, body },
    create: { userId, productId, rating, body },
  });

  revalidatePath(`/products`);
}

export async function deleteReview(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.review.deleteMany({
    where: { userId: session.user.id, productId },
  });
  revalidatePath(`/products`);
}
