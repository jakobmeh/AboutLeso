import type { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function getOrderBy(sort: string): NonNullable<Prisma.ProductFindManyArgs["orderBy"]> {
  switch (sort) {
    case "price_asc":
      return [{ priceCents: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ priceCents: "desc" }, { createdAt: "desc" }];
    case "name_asc":
      return [{ name: "asc" }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const q = (searchParams.get("q") ?? "").trim();
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const seasonId = searchParams.get("seasonId") ?? undefined;
  const audienceId = searchParams.get("audienceId") ?? undefined;
  const sort = (searchParams.get("sort") ?? "newest").trim();
  const active = (searchParams.get("active") ?? "true").trim();

  const page = parsePositiveInt(searchParams.get("page"), 1, 1000);
  const limit = parsePositiveInt(searchParams.get("limit"), 24, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;
  if (seasonId) where.seasonId = seasonId;
  if (audienceId) where.audienceId = audienceId;
  if (active !== "all") where.isActive = active !== "false";

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: getOrderBy(sort),
      include: {
        category: { select: { id: true, name: true, slug: true } },
        season: { select: { id: true, name: true, slug: true } },
        audience: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return Response.json({
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      priceCents: item.priceCents,
      price: item.priceCents / 100,
      stock: item.stock,
      isActive: item.isActive,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      category: item.category,
      season: item.season,
      audience: item.audience,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      q,
      categoryId: categoryId ?? null,
      seasonId: seasonId ?? null,
      audienceId: audienceId ?? null,
      active,
      sort,
    },
  });
}
