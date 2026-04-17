"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Role } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const IdSchema = z.string().trim().min(1, { message: "Invalid id." });

const NameSchema = z
  .string()
  .trim()
  .min(2, { message: "Name must have at least 2 characters." })
  .max(50, { message: "Name is too long." });

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureAdmin() {
  await requireRole([Role.ADMIN]);
}

function readName(formData: FormData) {
  const parsed = NameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid name.");
  }

  return parsed.data;
}

function readId(formData: FormData) {
  const parsed = IdSchema.safeParse(formData.get("id"));
  if (!parsed.success) {
    throw new Error("Invalid id.");
  }

  return parsed.data;
}

function redirectWithAdminError(message: string) {
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

export async function createCategory(formData: FormData) {
  await ensureAdmin();
  const name = readName(formData);

  await prisma.category.create({
    data: {
      name,
      slug: slugify(name),
    },
  });

  revalidatePath("/admin");
}

export async function deleteCategory(formData: FormData) {
  await ensureAdmin();
  const id = readId(formData);

  const usedByProducts = await prisma.product.count({
    where: { categoryId: id },
  });
  if (usedByProducts > 0) {
    redirectWithAdminError(
      `Kategorije ne mores izbrisati, ker je uporabljena na ${usedByProducts} izdelkih.`
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  revalidatePath("/admin");
}

export async function createSeason(formData: FormData) {
  await ensureAdmin();
  const name = readName(formData);

  await prisma.season.create({
    data: {
      name,
      slug: slugify(name),
    },
  });

  revalidatePath("/admin");
}

export async function deleteSeason(formData: FormData) {
  await ensureAdmin();
  const id = readId(formData);

  const usedByProducts = await prisma.product.count({
    where: { seasonId: id },
  });
  if (usedByProducts > 0) {
    redirectWithAdminError(
      `Sezone ne mores izbrisati, ker je uporabljena na ${usedByProducts} izdelkih.`
    );
  }

  await prisma.season.delete({
    where: { id },
  });

  revalidatePath("/admin");
}

export async function createAudience(formData: FormData) {
  await ensureAdmin();
  const name = readName(formData);

  await prisma.audience.create({
    data: {
      name,
      slug: slugify(name),
    },
  });

  revalidatePath("/admin");
}

export async function deleteAudience(formData: FormData) {
  await ensureAdmin();
  const id = readId(formData);

  const usedByProducts = await prisma.product.count({
    where: { audienceId: id },
  });
  if (usedByProducts > 0) {
    redirectWithAdminError(
      `Ciljne skupine ne mores izbrisati, ker je uporabljena na ${usedByProducts} izdelkih.`
    );
  }

  await prisma.audience.delete({
    where: { id },
  });

  revalidatePath("/admin");
}
