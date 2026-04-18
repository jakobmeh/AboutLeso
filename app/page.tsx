import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopBanner } from "./components/TopBanner";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function discountPct(price: number, compareAt: number) {
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export default async function HomePage() {
  const [audiences, categories, latestProducts] = await Promise.all([
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        category: { select: { name: true } },
        audience: { select: { name: true } },
      },
    }),
  ]);

  type AudienceItem = (typeof audiences)[0];
  type CategoryItem = (typeof categories)[0];
  type ProductItem = (typeof latestProducts)[0];

  return (
    <>
      <TopBanner
        id="spring-2026"
        message="Brezplačna dostava za naročila nad 80 € · Koda za 10% popusta: LESO10"
      />

      <main className="min-h-screen bg-white">
        {/* Audience hero — full width, 3 panels */}
        <section className="grid grid-cols-1 sm:grid-cols-3 h-[340px] sm:h-[420px]">
          {audiences.length === 0 ? (
            <Link
              href="/products"
              className="col-span-3 flex items-center justify-center bg-stone-900 text-white"
            >
              <span className="text-4xl font-light tracking-[0.4em] uppercase">Leso</span>
            </Link>
          ) : (
            audiences.map((a: AudienceItem, i: number) => {
              const bgColors = ["bg-stone-900", "bg-stone-700", "bg-stone-500"];
              return (
                <Link
                  key={a.id}
                  href={`/products?audienceId=${a.id}`}
                  className={`group relative flex items-end justify-start overflow-hidden ${bgColors[i % bgColors.length]}`}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <div className="relative p-8 sm:p-10">
                    <p className="text-xs tracking-[0.4em] uppercase text-white/60 mb-1">Nakupuj</p>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-widest uppercase text-white">
                      {a.name}
                    </h2>
                    <span className="mt-4 inline-block border border-white/60 px-5 py-2 text-xs tracking-widest uppercase text-white group-hover:bg-white group-hover:text-stone-900 transition-all">
                      Oglej si →
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </section>

        {/* Category grid */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
            <h2 className="text-xs tracking-[0.3em] uppercase text-stone-400 mb-6">Kategorije</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat: CategoryItem) => (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  className="group border border-stone-200 p-4 text-center hover:border-stone-900 hover:bg-stone-50 transition-all"
                >
                  <p className="text-sm font-medium text-stone-800 group-hover:text-stone-900">
                    {cat.name}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {cat._count.products} {cat._count.products === 1 ? "kos" : "kosov"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Promo banner */}
        <section className="bg-stone-900 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs tracking-[0.4em] uppercase text-stone-400">Nova kolekcija 2026</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-light leading-tight tracking-tight">
                Oblačila za vsako sezono
              </h2>
              <p className="mt-3 text-sm text-stone-400 max-w-md">
                Odkrijte našo kolekcijo skrbno izbranih oblačil za vsak stil in vsako priložnost.
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 bg-white px-10 py-3 text-xs tracking-widest uppercase text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Celoten katalog →
            </Link>
          </div>
        </section>

        {/* Latest products */}
        {latestProducts.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-stone-400">Sveže v katalogu</p>
                <h2 className="mt-1 text-2xl font-light text-stone-900">Novi prihodi</h2>
              </div>
              <Link
                href="/products"
                className="text-xs tracking-widest uppercase text-stone-500 underline underline-offset-4 hover:text-stone-900 transition-colors"
              >
                Vse →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-px bg-stone-100 sm:grid-cols-3 lg:grid-cols-4">
              {latestProducts.map((product: ProductItem) => {
                const pct = product.compareAtPriceCents
                  ? discountPct(product.priceCents, product.compareAtPriceCents)
                  : 0;
                return (
                  <article key={product.id} className="group bg-white hover:bg-stone-50 transition-colors">
                    <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <span className="text-xs tracking-widest uppercase text-stone-300">Leso</span>
                        </div>
                      )}
                      {pct > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-0.5">
                          -{pct}%
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs tracking-widest uppercase text-stone-400">
                        {product.category.name}
                      </p>
                      <h3 className="mt-0.5 text-sm font-medium text-stone-900 leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-sm font-medium ${pct > 0 ? "text-red-600" : "text-stone-800"}`}>
                          {formatPrice(product.priceCents)}
                        </span>
                        {product.compareAtPriceCents && (
                          <span className="text-xs text-stone-400 line-through">
                            {formatPrice(product.compareAtPriceCents)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/products`}
                        className="mt-3 block w-full border border-stone-200 py-2 text-center text-xs tracking-widest uppercase text-stone-600 opacity-0 group-hover:opacity-100 hover:border-stone-900 hover:text-stone-900 transition-all"
                      >
                        Poglej
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <span className="text-xl font-light tracking-[0.4em] uppercase text-stone-900">Leso</span>
              <p className="text-xs text-stone-400">© 2026 Leso. Vse pravice pridržane.</p>
              <div className="flex gap-6">
                <Link href="/products" className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-700">Katalog</Link>
                <Link href="/login" className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-700">Prijava</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
