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

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function discountPct(price: number, compareAt: number) {
  return Math.round(((compareAt - price) / compareAt) * 100);
}

const ORDER_BY_NEWEST: ProductOrderBy = [{ createdAt: "desc" as const }];
const ORDER_BY_PRICE_ASC: ProductOrderBy = [{ priceCents: "asc" as const }, { createdAt: "desc" as const }];
const ORDER_BY_PRICE_DESC: ProductOrderBy = [{ priceCents: "desc" as const }, { createdAt: "desc" as const }];
const ORDER_BY_NAME_ASC: ProductOrderBy = [{ name: "asc" as const }];

function getOrderBy(sort: string) {
  switch (sort) {
    case "price_asc": return ORDER_BY_PRICE_ASC;
    case "price_desc": return ORDER_BY_PRICE_DESC;
    case "name_asc": return ORDER_BY_NAME_ASC;
    default: return ORDER_BY_NEWEST;
  }
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
  const minPrice = parseFloat(single(resolved.minPrice)) || 0;
  const maxPrice = parseFloat(single(resolved.maxPrice)) || 0;
  const onlyInStock = single(resolved.inStock) === "1";
  const onlySale = single(resolved.sale) === "1";

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
  if (onlyInStock) where.stock = { gt: 0 };
  if (onlySale) where.compareAtPriceCents = { not: null };
  if (minPrice > 0) where.priceCents = { ...(where.priceCents as object), gte: Math.round(minPrice * 100) };
  if (maxPrice > 0) where.priceCents = { ...(where.priceCents as object), lte: Math.round(maxPrice * 100) };

  const [rawProducts, categories, seasons, audiences] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: getOrderBy(sort),
      include: {
        category: { select: { id: true, name: true } },
        season: { select: { id: true, name: true } },
        audience: { select: { id: true, name: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isActive: true, ...(audienceId ? { audienceId } : {}) } } } } },
    }),
    prisma.season.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
  ]);

  type ProductItem = (typeof rawProducts)[0];
  type CategoryWithCount = (typeof categories)[0];
  type TaxItem = (typeof seasons)[0];

  const products: ProductItem[] =
    sort === "discount"
      ? [...rawProducts].sort((a: ProductItem, b: ProductItem) => {
          const da = a.compareAtPriceCents ? discountPct(a.priceCents, a.compareAtPriceCents) : 0;
          const db = b.compareAtPriceCents ? discountPct(b.priceCents, b.compareAtPriceCents) : 0;
          return db - da;
        })
      : rawProducts;

  function buildUrl(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    const base: Record<string, string> = {
      q,
      categoryId,
      seasonId,
      audienceId,
      sort: sort !== "newest" ? sort : "",
      minPrice: minPrice > 0 ? String(minPrice) : "",
      maxPrice: maxPrice > 0 ? String(maxPrice) : "",
      inStock: onlyInStock ? "1" : "",
      sale: onlySale ? "1" : "",
    };
    const merged = { ...base, ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])) };
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v); });
    const str = params.toString();
    return `/products${str ? `?${str}` : ""}`;
  }

  const selectedCategory = categories.find((c: CategoryWithCount) => c.id === categoryId);
  const selectedSeason = seasons.find((s: TaxItem) => s.id === seasonId);
  const selectedAudience = audiences.find((a: TaxItem) => a.id === audienceId);

  const pageTitle = selectedCategory?.name ?? selectedAudience?.name ?? "Vse oblačila";

  const sortLabels: Record<string, string> = {
    newest: "Najnovejši",
    price_asc: "Cena ↑",
    price_desc: "Cena ↓",
    discount: "Popust ↓",
    name_asc: "Ime A–Ž",
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-stone-400 mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:text-stone-700">Domov</Link>
          <span>/</span>
          {selectedAudience && (
            <>
              <Link href={buildUrl({ categoryId: "" })} className="hover:text-stone-700">{selectedAudience.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-stone-700">{selectedCategory?.name ?? "Vse oblačila"}</span>
        </nav>

        <div className="flex gap-8">
          {/* Left sidebar — category list (BestSecret style) */}
          <aside className="hidden lg:block w-52 shrink-0">
            <h1 className="text-xl font-semibold text-stone-900 mb-5">{pageTitle}</h1>

            {/* Category list */}
            <div className="mb-6">
              <Link
                href={buildUrl({ categoryId: "" })}
                className={`flex items-center justify-between py-2 text-sm border-b border-stone-100 transition-colors ${!categoryId ? "text-stone-900 font-semibold" : "text-stone-500 hover:text-stone-900"}`}
              >
                <span>Vse</span>
              </Link>
              {categories.map((cat: CategoryWithCount) => (
                <Link
                  key={cat.id}
                  href={buildUrl({ categoryId: cat.id })}
                  className={`flex items-center justify-between py-2 text-sm border-b border-stone-100 transition-colors ${categoryId === cat.id ? "text-stone-900 font-semibold" : "text-stone-500 hover:text-stone-900"}`}
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-stone-400">{cat._count.products}</span>
                </Link>
              ))}
            </div>

            {/* Season filter */}
            <form method="get" className="space-y-4">
              {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
              {audienceId && <input type="hidden" name="audienceId" value={audienceId} />}
              {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
              {onlySale && <input type="hidden" name="sale" value="1" />}

              <div>
                <p className="text-xs tracking-widest uppercase text-stone-400 mb-2">Sezona</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="seasonId" value="" defaultChecked={!seasonId} className="accent-stone-800" />
                    <span className="text-sm text-stone-500 group-hover:text-stone-900">Vse</span>
                  </label>
                  {seasons.map((s: TaxItem) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="seasonId" value={s.id} defaultChecked={seasonId === s.id} className="accent-stone-800" />
                      <span className="text-sm text-stone-600 group-hover:text-stone-900">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs tracking-widest uppercase text-stone-400 mb-2">Cena (€)</p>
                <div className="flex items-center gap-2">
                  <input type="number" name="minPrice" min={0} defaultValue={minPrice > 0 ? minPrice : ""} placeholder="Od" className="w-full border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-stone-600" />
                  <span className="text-stone-300 text-xs">–</span>
                  <input type="number" name="maxPrice" min={0} defaultValue={maxPrice > 0 ? maxPrice : ""} placeholder="Do" className="w-full border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-stone-600" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="inStock" value="1" defaultChecked={onlyInStock} className="accent-stone-800" />
                  <span className="text-sm text-stone-600">Samo na zalogi</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="sale" value="1" defaultChecked={onlySale} className="accent-stone-800" />
                  <span className="text-sm text-stone-600">Samo znižano</span>
                </label>
              </div>

              <button type="submit" className="w-full border border-stone-800 py-2 text-xs tracking-widest uppercase text-stone-800 hover:bg-stone-900 hover:text-white transition-all">
                Filtriraj
              </button>
              <Link href="/products" className="block text-center text-xs tracking-widest uppercase text-stone-400 underline underline-offset-4 hover:text-stone-700">
                Ponastavi
              </Link>
            </form>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Mobile: page title */}
              <h1 className="lg:hidden text-lg font-semibold text-stone-900 w-full">{pageTitle}</h1>

              {/* Active filter chips */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <span className="text-sm text-stone-500 shrink-0">
                  {products.length} {products.length === 1 ? "kos" : "kosov"}
                </span>

                {selectedAudience && (
                  <Link href={buildUrl({ audienceId: "" })} className="inline-flex items-center gap-1 border border-stone-300 rounded-full px-3 py-1 text-xs text-stone-700 hover:border-stone-900 transition-colors">
                    {selectedAudience.name} ×
                  </Link>
                )}
                {selectedCategory && (
                  <Link href={buildUrl({ categoryId: "" })} className="inline-flex items-center gap-1 border border-stone-300 rounded-full px-3 py-1 text-xs text-stone-700 hover:border-stone-900 transition-colors">
                    {selectedCategory.name} ×
                  </Link>
                )}
                {selectedSeason && (
                  <Link href={buildUrl({ seasonId: "" })} className="inline-flex items-center gap-1 border border-stone-300 rounded-full px-3 py-1 text-xs text-stone-700 hover:border-stone-900 transition-colors">
                    {selectedSeason.name} ×
                  </Link>
                )}
                {q && (
                  <Link href={buildUrl({ q: "" })} className="inline-flex items-center gap-1 border border-stone-300 rounded-full px-3 py-1 text-xs text-stone-700 hover:border-stone-900 transition-colors">
                    &ldquo;{q}&rdquo; ×
                  </Link>
                )}
                {onlySale && (
                  <Link href={buildUrl({ sale: "" })} className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-3 py-1 text-xs text-red-600 hover:border-red-500 transition-colors">
                    Znižano ×
                  </Link>
                )}
                {onlyInStock && (
                  <Link href={buildUrl({ inStock: "" })} className="inline-flex items-center gap-1 border border-stone-300 rounded-full px-3 py-1 text-xs text-stone-700 hover:border-stone-900 transition-colors">
                    Na zalogi ×
                  </Link>
                )}
              </div>

              {/* Sort */}
              <form method="get" className="flex items-center gap-2 shrink-0">
                {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
                {audienceId && <input type="hidden" name="audienceId" value={audienceId} />}
                {seasonId && <input type="hidden" name="seasonId" value={seasonId} />}
                {q && <input type="hidden" name="q" value={q} />}
                {onlyInStock && <input type="hidden" name="inStock" value="1" />}
                {onlySale && <input type="hidden" name="sale" value="1" />}
                {minPrice > 0 && <input type="hidden" name="minPrice" value={String(minPrice)} />}
                {maxPrice > 0 && <input type="hidden" name="maxPrice" value={String(maxPrice)} />}
                <span className="text-xs text-stone-400 hidden sm:block">Razvrsti:</span>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="border border-stone-200 rounded-full px-3 py-1.5 text-xs text-stone-700 outline-none focus:border-stone-600 bg-white cursor-pointer"
                >
                  <option value="newest">Najnovejši</option>
                  <option value="price_asc">Cena: najnižja</option>
                  <option value="price_desc">Cena: najvišja</option>
                  <option value="discount">Največji popust</option>
                  <option value="name_asc">Ime A–Ž</option>
                </select>
                <button type="submit" className="border border-stone-200 rounded-full px-3 py-1.5 text-xs text-stone-600 hover:border-stone-600 transition-colors">
                  {sortLabels[sort] ?? "OK"}
                </button>
              </form>
            </div>

            {/* Mobile filter bar */}
            <details className="lg:hidden mb-4 border border-stone-200 rounded">
              <summary className="px-4 py-2.5 text-xs tracking-widest uppercase text-stone-700 cursor-pointer select-none flex items-center justify-between">
                <span>Filtri</span>
                <span className="text-stone-400">↕</span>
              </summary>
              <form method="get" className="px-4 pb-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-4">
                {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
                {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}

                <div className="col-span-2">
                  <p className="text-xs tracking-widest uppercase text-stone-400 mb-1.5">Kategorija</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={buildUrl({ categoryId: "" })} className={`border rounded-full px-3 py-1 text-xs ${!categoryId ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600"}`}>Vse</Link>
                    {categories.map((cat: CategoryWithCount) => (
                      <Link key={cat.id} href={buildUrl({ categoryId: cat.id })} className={`border rounded-full px-3 py-1 text-xs ${categoryId === cat.id ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600"}`}>{cat.name}</Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs tracking-widest uppercase text-stone-400 mb-1.5">Sezona</p>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="seasonId" value="" defaultChecked={!seasonId} className="accent-stone-800" />
                      <span className="text-sm text-stone-500">Vse</span>
                    </label>
                    {seasons.map((s: TaxItem) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="seasonId" value={s.id} defaultChecked={seasonId === s.id} className="accent-stone-800" />
                        <span className="text-sm text-stone-600">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs tracking-widest uppercase text-stone-400 mb-1.5">Za koga</p>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audienceId" value="" defaultChecked={!audienceId} className="accent-stone-800" />
                      <span className="text-sm text-stone-500">Vse</span>
                    </label>
                    {audiences.map((a: TaxItem) => (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="audienceId" value={a.id} defaultChecked={audienceId === a.id} className="accent-stone-800" />
                        <span className="text-sm text-stone-600">{a.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-xs tracking-widest uppercase text-stone-400 mb-1.5">Cena (€)</p>
                  <div className="flex items-center gap-2">
                    <input type="number" name="minPrice" min={0} defaultValue={minPrice > 0 ? minPrice : ""} placeholder="Od" className="w-full border border-stone-200 px-2 py-1.5 text-sm outline-none" />
                    <span className="text-stone-300">–</span>
                    <input type="number" name="maxPrice" min={0} defaultValue={maxPrice > 0 ? maxPrice : ""} placeholder="Do" className="w-full border border-stone-200 px-2 py-1.5 text-sm outline-none" />
                  </div>
                </div>

                <div className="col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="inStock" value="1" defaultChecked={onlyInStock} className="accent-stone-800" />
                    <span className="text-sm text-stone-600">Na zalogi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="sale" value="1" defaultChecked={onlySale} className="accent-stone-800" />
                    <span className="text-sm text-stone-600">Znižano</span>
                  </label>
                </div>

                <button type="submit" className="col-span-2 bg-stone-900 py-2 text-xs tracking-widest uppercase text-white">Filtriraj</button>
              </form>
            </details>

            {/* Product grid */}
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="text-stone-400 text-sm">Ni izdelkov za izbrane filtre.</p>
                <Link href="/products" className="mt-4 text-xs tracking-widest uppercase underline underline-offset-4 text-stone-500 hover:text-stone-800">
                  Ponastavi filtre
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-stone-100 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((item: ProductItem) => {
                  const pct = item.compareAtPriceCents
                    ? discountPct(item.priceCents, item.compareAtPriceCents)
                    : 0;
                  return (
                    <article key={item.id} className="group relative bg-white hover:bg-stone-50 transition-colors">
                      <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <span className="text-xs tracking-widest uppercase text-stone-300">Leso</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {pct > 0 && (
                            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5">
                              -{pct}%
                            </span>
                          )}
                          {item.stock === 0 && (
                            <span className="bg-stone-800/80 text-white text-xs px-2 py-0.5 tracking-widest uppercase">
                              Razprodano
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4">
                        <p className="text-xs tracking-widest uppercase text-stone-400">
                          {item.category.name}
                        </p>
                        <h2 className="mt-0.5 text-sm font-medium text-stone-900 leading-snug line-clamp-2">
                          {item.name}
                        </h2>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className={`text-sm font-semibold ${pct > 0 ? "text-red-600" : "text-stone-800"}`}>
                            {formatPrice(item.priceCents)}
                          </span>
                          {item.compareAtPriceCents && (
                            <span className="text-xs text-stone-400 line-through">
                              {formatPrice(item.compareAtPriceCents)}
                            </span>
                          )}
                        </div>

                        {item.stock > 0 ? (
                          session?.user ? (
                            <form action={addToCart} className="mt-3">
                              <input type="hidden" name="productId" value={item.id} />
                              <input type="hidden" name="quantity" value="1" />
                              <button type="submit" className="w-full border border-stone-200 py-2 text-xs tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:bg-stone-900 hover:text-white transition-all">
                                Dodaj v košarico
                              </button>
                            </form>
                          ) : (
                            <Link href="/login" className="mt-3 block w-full border border-stone-200 py-2 text-center text-xs tracking-widest uppercase text-stone-500 hover:border-stone-700 hover:text-stone-900 transition-colors">
                              Prijavi se
                            </Link>
                          )
                        ) : (
                          <div className="mt-3 w-full border border-stone-100 py-2 text-center text-xs tracking-widest uppercase text-stone-300">
                            Ni na zalogi
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
