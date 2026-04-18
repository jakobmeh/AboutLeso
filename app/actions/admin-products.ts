"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/authz";
import {
  parseVariantStocksInput,
  totalVariantStock,
} from "@/lib/product-variants";
import { prisma } from "@/lib/prisma";

const IdSchema = z.string().trim().min(1, { message: "Invalid id." });

const PriceString = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0.01 && Number(v) <= 99999, {
    message: "Invalid price.",
  });

const CreateProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  price: PriceString,
  compareAtPrice: z.string().trim().optional(),
  stock: z
    .string()
    .trim()
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: "Invalid stock.",
    }),
  variantStocks: z.string().trim().optional(),
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
    compareAtPrice: formData.get("compareAtPrice"),
    stock: formData.get("stock"),
    variantStocks: formData.get("variantStocks"),
    categoryId: formData.get("categoryId"),
    seasonId: formData.get("seasonId"),
    audienceId: formData.get("audienceId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const {
    name,
    description,
    price,
    compareAtPrice,
    stock,
    variantStocks,
    categoryId,
    seasonId,
    audienceId,
  } = parsed.data;
  const slug = await makeUniqueProductSlug(name);
  const priceCents = Math.round(Number(price) * 100);
  const compareAtPriceCents =
    compareAtPrice && Number(compareAtPrice) > Number(price)
      ? Math.round(Number(compareAtPrice) * 100)
      : null;
  let variantList: ReturnType<typeof parseVariantStocksInput>;
  try {
    variantList = parseVariantStocksInput(variantStocks ?? "", Number(stock));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid variant sizes.");
  }
  const stockTotal = totalVariantStock(variantList);

  await prisma.product.create({
    data: {
      name,
      slug,
      description: description || null,
      priceCents,
      compareAtPriceCents,
      stock: stockTotal,
      categoryId,
      seasonId,
      audienceId,
      isActive: formData.get("isActive") === "on",
      variants: {
        createMany: {
          data: variantList.map((variant) => ({
            size: variant.size,
            stock: variant.stock,
            isActive: true,
          })),
        },
      },
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
    compareAtPrice: formData.get("compareAtPrice"),
    stock: formData.get("stock"),
    variantStocks: formData.get("variantStocks"),
    categoryId: formData.get("categoryId"),
    seasonId: formData.get("seasonId"),
    audienceId: formData.get("audienceId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const {
    id,
    name,
    description,
    price,
    compareAtPrice,
    stock,
    variantStocks,
    categoryId,
    seasonId,
    audienceId,
  } = parsed.data;
  const slug = await makeUniqueProductSlug(name, id);
  const priceCents = Math.round(Number(price) * 100);
  const compareAtPriceCents =
    compareAtPrice && Number(compareAtPrice) > Number(price)
      ? Math.round(Number(compareAtPrice) * 100)
      : null;
  let variantList: ReturnType<typeof parseVariantStocksInput>;
  try {
    variantList = parseVariantStocksInput(variantStocks ?? "", Number(stock));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid variant sizes.");
  }
  const stockTotal = totalVariantStock(variantList);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        priceCents,
        compareAtPriceCents,
        stock: stockTotal,
        categoryId,
        seasonId,
        audienceId,
        isActive: formData.get("isActive") === "on",
      },
    });

    const sizes = variantList.map((variant) => variant.size);

    await tx.productVariant.updateMany({
      where: {
        productId: id,
        size: { notIn: sizes },
      },
      data: {
        stock: 0,
        isActive: false,
      },
    });

    for (const variant of variantList) {
      await tx.productVariant.upsert({
        where: {
          productId_size: {
            productId: id,
            size: variant.size,
          },
        },
        create: {
          productId: id,
          size: variant.size,
          stock: variant.stock,
          isActive: true,
        },
        update: {
          stock: variant.stock,
          isActive: true,
        },
      });
    }
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
