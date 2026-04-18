import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default async function HomePage() {
  const session = await auth();

  const [categories, seasons, latestProducts] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, take: 6 }),
    prisma.season.findMany({ orderBy: { name: "asc" }, take: 4 }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        category: { select: { name: true } },
        season: { select: { name: true } },
        audience: { select: { name: true } },
      },
    }),
  ]);

  type CatItem = (typeof categories)[0];
  type SeasonItem = (typeof seasons)[0];
  type ProductItem = (typeof latestProducts)[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-stone-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-28 md:py-40">
          <p className="text-xs tracking-[0.4em] uppercase text-stone-400">Nova kolekcija 2026</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-light leading-tight tracking-tight md:text-7xl">
            Oblačila za vsako sezono
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-stone-400">
            Odkrijte našo kolekcijo oblačil, skrbno izbranih za vsak stil in vsako priložnost.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="bg-white px-8 py-3 text-xs tracking-widest uppercase text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Oglejte si katalog
            </Link>
            {!session?.user && (
              <Link
                href="/register"
                className="border border-stone-600 px-8 py-3 text-xs tracking-widest uppercase text-stone-300 hover:border-stone-400 hover:text-white transition-colors"
              >
                Ustvarite račun
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Kategorije */}
      {categories.length > 0 && (
        <section className="border-b border-stone-100 bg-stone-50">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs tracking-widest uppercase text-stone-400 mr-2">Kategorije:</span>
              {categories.map((cat: CatItem) => (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  className="border border-stone-300 px-4 py-2 text-xs tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
              {seasons.map((s: SeasonItem) => (
                <Link
                  key={s.id}
                  href={`/products?seasonId=${s.id}`}
                  className="border border-stone-300 px-4 py-2 text-xs tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Novi izdelki */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Sveže v katalogu</p>
            <h2 className="mt-2 text-3xl font-light text-stone-900">Novi prihodi</h2>
          </div>
          <Link
            href="/products"
            className="text-xs tracking-widest uppercase text-stone-500 underline underline-offset-4 hover:text-stone-900 transition-colors"
          >
            Vse izdelke →
          </Link>
        </div>

        {latestProducts.length === 0 ? (
          <div className="py-20 text-center text-stone-400">
            <p className="text-sm">Trenutno ni aktivnih izdelkov.</p>
            <Link href="/products" className="mt-4 inline-block text-xs tracking-widest uppercase underline">
              Poglej katalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px bg-stone-200 md:grid-cols-3 lg:grid-cols-4">
            {latestProducts.map((product: ProductItem) => (
              <article key={product.id} className="group bg-white p-6 hover:bg-stone-50 transition-colors">
                <div className="mb-4 aspect-[3/4] bg-stone-100 overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-xs tracking-widest uppercase text-stone-300">Leso</span>
                    </div>
                  )}
                </div>
                <p className="text-xs tracking-widest uppercase text-stone-400">
                  {product.category.name}
                </p>
                <h3 className="mt-1 text-sm font-medium text-stone-900 leading-snug">{product.name}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-stone-700">{formatPrice(product.priceCents)}</p>
                  {product.stock === 0 && (
                    <span className="text-xs tracking-widest uppercase text-red-400">Razprodano</span>
                  )}
                </div>
                <Link
                  href="/products"
                  className="mt-4 block w-full border border-stone-300 py-2 text-center text-xs tracking-widest uppercase text-stone-600 opacity-0 group-hover:opacity-100 hover:border-stone-900 hover:text-stone-900 transition-all"
                >
                  {product.stock > 0 ? "Dodaj v košarico" : "Ni na zalogi"}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CTA banner */}
      <section className="bg-stone-100">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-3xl font-light text-stone-900">Brezplačna dostava nad 80 €</h2>
          <p className="mt-3 text-sm text-stone-500">Za vse naročila nad 80 € zagotavljamo brezplačno dostavo po Sloveniji.</p>
          <Link
            href="/products"
            className="mt-8 inline-block bg-stone-900 px-10 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
          >
            Nakupuj zdaj
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <span className="text-lg font-light tracking-[0.4em] uppercase text-stone-900">Leso</span>
            <p className="text-xs text-stone-400">© 2026 Leso. Vse pravice pridržane.</p>
            <div className="flex gap-6">
              <Link href="/products" className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-700">Katalog</Link>
              <Link href="/login" className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-700">Prijava</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
