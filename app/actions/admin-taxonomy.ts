"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

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
  const parsed = z.string().cuid().safeParse(formData.get("id"));
  if (!parsed.success) {
    throw new Error("Invalid id.");
  }

  return parsed.data;
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

  await prisma.audience.delete({
    where: { id },
  });

  revalidatePath("/admin");
}
