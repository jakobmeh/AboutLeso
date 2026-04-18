import Link from "next/link";
import { auth } from "@/auth";
import { addToCart } from "@/app/actions/cart";
import { prisma } from "@/lib/prisma";

type SearchParamsInput = Record<string, string | string[] | undefined>;
type ProductFindManyArgs = NonNullable<Parameters<typeof prisma.product.findMany>[0]>;
type ProductWhere = NonNullable<ProductFindManyArgs["where"]>;
type ProductOrderBy = NonNullable<ProductFindManyArgs["orderBy"]>;

function single(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const ORDER_BY_NEWEST: ProductOrderBy = [{ createdAt: "desc" as const }];
const ORDER_BY_PRICE_ASC: ProductOrderBy = [{ priceCents: "asc" as const }, { createdAt: "desc" as const }];
const ORDER_BY_PRICE_DESC: ProductOrderBy = [{ priceCents: "desc" as const }, { createdAt: "desc" as const }];
const ORDER_BY_NAME_ASC: ProductOrderBy = [{ name: "asc" as const }, { createdAt: "desc" as const }];

function getOrderBy(sort: string) {
  switch (sort) {
    case "price_asc": return ORDER_BY_PRICE_ASC;
    case "price_desc": return ORDER_BY_PRICE_DESC;
    case "name_asc": return ORDER_BY_NAME_ASC;
    default: return ORDER_BY_NEWEST;
  }
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const session = await auth();
  const resolved = await searchParams;

  const q = single(resolved.q).trim();
  const categoryId = single(resolved.categoryId).trim();
  const seasonId = single(resolved.seasonId).trim();
  const audienceId = single(resolved.audienceId).trim();
  const sort = single(resolved.sort).trim() || "newest";

  const where: ProductWhere = { isActive: true };
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

  type ProductItem = (typeof products)[0];
  type TaxItem = (typeof categories)[0];
  const hasFilters = q || categoryId || seasonId || audienceId;

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h1 className="text-3xl font-light tracking-wide text-stone-900">Katalog</h1>
          <p className="mt-1 text-sm text-stone-500">
            {products.length} {products.length === 1 ? "izdelek" : "izdelkov"}
            {hasFilters ? " (filtrirano)" : ""}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Filters sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <form method="get" className="space-y-6">
              <div>
                <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Iskanje</label>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Ime izdelka..."
                  className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-700 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Kategorija</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="categoryId" value="" defaultChecked={!categoryId} className="accent-stone-800" />
                    <span className="text-sm text-stone-600">Vse</span>
                  </label>
                  {categories.map((item: TaxItem) => (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="categoryId" value={item.id} defaultChecked={categoryId === item.id} className="accent-stone-800" />
                      <span className="text-sm text-stone-600">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Sezona</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="seasonId" value="" defaultChecked={!seasonId} className="accent-stone-800" />
                    <span className="text-sm text-stone-600">Vse</span>
                  </label>
                  {seasons.map((item: TaxItem) => (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="seasonId" value={item.id} defaultChecked={seasonId === item.id} className="accent-stone-800" />
                      <span className="text-sm text-stone-600">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Za koga</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="audienceId" value="" defaultChecked={!audienceId} className="accent-stone-800" />
                    <span className="text-sm text-stone-600">Vse</span>
                  </label>
                  {audiences.map((item: TaxItem) => (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audienceId" value={item.id} defaultChecked={audienceId === item.id} className="accent-stone-800" />
                      <span className="text-sm text-stone-600">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-stone-400 mb-2">Razvrsti po</label>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-700 bg-white"
                >
                  <option value="newest">Najnovejši</option>
                  <option value="price_asc">Cena: najnižja</option>
                  <option value="price_desc">Cena: najvišja</option>
                  <option value="name_asc">Ime A–Ž</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full bg-stone-900 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
                >
                  Filtriraj
                </button>
                {hasFilters && (
                  <Link
                    href="/products"
                    className="w-full border border-stone-300 py-2 text-center text-xs tracking-widest uppercase text-stone-600 hover:border-stone-600 hover:text-stone-900 transition-colors"
                  >
                    Ponastavi
                  </Link>
                )}
              </div>
            </form>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="text-stone-400 text-sm">Ni izdelkov za te filtre.</p>
                <Link href="/products" className="mt-4 text-xs tracking-widest uppercase underline underline-offset-4 text-stone-500 hover:text-stone-800">
                  Ponastavi filtre
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-stone-200 md:grid-cols-3">
                {products.map((item: ProductItem) => (
                  <article key={item.id} className="group bg-white p-5 hover:bg-stone-50 transition-colors">
                    <div className="mb-4 aspect-[3/4] bg-stone-100 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <span className="text-xs tracking-widest uppercase text-stone-300">Leso</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs tracking-widest uppercase text-stone-400">{item.category.name} · {item.season.name}</p>
                    <h2 className="mt-1 text-sm font-medium text-stone-900 leading-snug">{item.name}</h2>
                    {item.description && (
                      <p className="mt-1 text-xs text-stone-500 line-clamp-2">{item.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-stone-800">{formatPrice(item.priceCents)}</p>
                      <span className={`text-xs tracking-widest uppercase ${item.stock > 0 ? "text-green-600" : "text-red-400"}`}>
                        {item.stock > 0 ? `${item.stock} kos` : "Razprodano"}
                      </span>
                    </div>

                    {item.stock > 0 ? (
                      session?.user ? (
                        <form action={addToCart} className="mt-4">
                          <input type="hidden" name="productId" value={item.id} />
                          <input type="hidden" name="quantity" value="1" />
                          <button
                            type="submit"
                            className="w-full border border-stone-300 py-2 text-xs tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:bg-stone-900 hover:text-white transition-all"
                          >
                            Dodaj v košarico
                          </button>
                        </form>
                      ) : (
                        <Link
                          href="/login"
                          className="mt-4 block w-full border border-stone-300 py-2 text-center text-xs tracking-widest uppercase text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-colors"
                        >
                          Prijavi se za nakup
                        </Link>
                      )
                    ) : (
                      <div className="mt-4 w-full border border-stone-200 py-2 text-center text-xs tracking-widest uppercase text-stone-300">
                        Ni na zalogi
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
