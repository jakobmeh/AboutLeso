"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const IdSchema = z.string().trim().min(1, { message: "Invalid id." });

const CreateProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  price: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0.01 && Number(value) <= 99999, {
      message: "Invalid price.",
    }),
  stock: z
    .string()
    .trim()
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: "Invalid stock.",
    }),
  categoryId: IdSchema,
  seasonId: IdSchema,
  audienceId: IdSchema,
});

const UpdateProductSchema = CreateProductSchema.extend({
  id: IdSchema,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureAdmin() {
  await requireRole([Role.ADMIN]);
}

async function makeUniqueProductSlug(baseName: string, excludeProductId?: string) {
  const baseSlug = slugify(baseName) || "product";
  let candidate = baseSlug;
  let index = 2;

  while (true) {
    const exists = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!exists || exists.id === excludeProductId) return candidate;
    candidate = `${baseSlug}-${index}`;
    index += 1;
  }
}

export async function createProduct(formData: FormData) {
  await ensureAdmin();

  const parsed = CreateProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    seasonId: formData.get("seasonId"),
    audienceId: formData.get("audienceId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { name, description, price, stock, categoryId, seasonId, audienceId } = parsed.data;
  const slug = await makeUniqueProductSlug(name);

  await prisma.product.create({
    data: {
      name,
      slug,
      description: description || null,
      priceCents: Math.round(Number(price) * 100),
      stock: Number(stock),
      categoryId,
      seasonId,
      audienceId,
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath("/admin");
}

export async function deleteProduct(formData: FormData) {
  await ensureAdmin();

  const parsed = IdSchema.safeParse(formData.get("id"));
  if (!parsed.success) {
    throw new Error("Invalid id.");
  }

  await prisma.product.delete({
    where: { id: parsed.data },
  });

  revalidatePath("/admin");
}

export async function updateProduct(formData: FormData) {
  await ensureAdmin();

  const parsed = UpdateProductSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    seasonId: formData.get("seasonId"),
    audienceId: formData.get("audienceId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, name, description, price, stock, categoryId, seasonId, audienceId } = parsed.data;
  const slug = await makeUniqueProductSlug(name, id);

  await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      description: description || null,
      priceCents: Math.round(Number(price) * 100),
      stock: Number(stock),
      categoryId,
      seasonId,
      audienceId,
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath("/admin");
}

export async function toggleProductActive(formData: FormData) {
  await ensureAdmin();

  const parsed = IdSchema.safeParse(formData.get("id"));
  if (!parsed.success) {
    throw new Error("Invalid id.");
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data },
    select: { isActive: true },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  await prisma.product.update({
    where: { id: parsed.data },
    data: { isActive: !product.isActive },
  });

  revalidatePath("/admin");
}
