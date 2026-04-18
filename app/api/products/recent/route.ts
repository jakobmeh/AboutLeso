import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const slugs = req.nextUrl.searchParams.get("slugs")?.split(",").filter(Boolean) ?? [];
  if (slugs.length === 0) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: { slug: true, name: true, priceCents: true, compareAtPriceCents: true, imageUrl: true },
  });

  type RecentProduct = (typeof products)[0];
  const ordered = slugs
    .map((s: string) => products.find((p: RecentProduct) => p.slug === s))
    .filter((product): product is RecentProduct => Boolean(product));
  return NextResponse.json({ products: ordered });
}
