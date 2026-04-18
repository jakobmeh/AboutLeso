import Link from "next/link";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput[] {
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

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} EUR`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const resolved = await searchParams;

  const q = single(resolved.q).trim();
  const categoryId = single(resolved.categoryId).trim();
  const seasonId = single(resolved.seasonId).trim();
  const audienceId = single(resolved.audienceId).trim();
  const sort = single(resolved.sort).trim() || "newest";

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (seasonId) where.seasonId = seasonId;
  if (audienceId) where.audienceId = audienceId;

  const [products, categories, seasons, audiences] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: getOrderBy(sort),
      include: {
        category: { select: { name: true } },
        season: { select: { name: true } },
        audience: { select: { name: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.season.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-12">
      <main className="mx-auto max-w-6xl space-y-6">
        <section className="rounded border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-800">
            Products
          </h1>
          <p className="mt-3 text-sm text-stone-600">Public catalog with search and filters.</p>
        </section>

        <section className="rounded border border-stone-200 bg-white p-6">
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search products..."
              className="md:col-span-2 border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
            />
            <select
              name="categoryId"
              defaultValue={categoryId}
              className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              name="seasonId"
              defaultValue={seasonId}
              className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
            >
              <option value="">All seasons</option>
              {seasons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              name="audienceId"
              defaultValue={audienceId}
              className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
            >
              <option value="">All audiences</option>
              {audiences.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price low to high</option>
              <option value="price_desc">Price high to low</option>
              <option value="name_asc">Name A-Z</option>
            </select>
            <div className="flex gap-2 md:col-span-5">
              <button
                type="submit"
                className="bg-stone-800 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-900"
              >
                Apply filters
              </button>
              <Link
                href="/products"
                className="border border-stone-300 px-4 py-2 text-xs tracking-widest uppercase text-stone-600 hover:text-stone-800"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 ? (
            <div className="rounded border border-stone-200 bg-white p-6 text-stone-500">
              No products found for these filters.
            </div>
          ) : (
            products.map((item) => (
              <article key={item.id} className="rounded border border-stone-200 bg-white p-5">
                <h2 className="text-lg font-medium text-stone-800">{item.name}</h2>
                <p className="mt-1 text-sm text-stone-500">{formatPrice(item.priceCents)}</p>
                <p className="mt-3 text-sm text-stone-600">
                  {item.description || "No description yet."}
                </p>
                <p className="mt-3 text-xs uppercase tracking-widest text-stone-500">
                  {item.category.name} · {item.season.name} · {item.audience.name}
                </p>
                <p
                  className={
                    item.stock > 0
                      ? "mt-3 text-xs uppercase tracking-widest text-green-700"
                      : "mt-3 text-xs uppercase tracking-widest text-red-700"
                  }
                >
                  {item.stock > 0 ? `In stock (${item.stock})` : "Out of stock"}
                </p>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
