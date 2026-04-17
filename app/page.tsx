import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} EUR`;
}

export default async function HomePage() {
  const session = await auth();

  const [activeProductsCount, categoryCount, audienceCount, categories, seasons, latestProducts] =
    await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.audience.count(),
      prisma.category.findMany({ orderBy: { name: "asc" }, take: 6 }),
      prisma.season.findMany({ orderBy: { name: "asc" }, take: 4 }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          category: { select: { id: true, name: true } },
          season: { select: { id: true, name: true } },
          audience: { select: { id: true, name: true } },
        },
      }),
    ]);

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-10">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded border border-stone-200 bg-white p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Leso Store</p>
          <h1 className="mt-3 text-3xl font-light tracking-[0.08em] text-stone-900">
            Spletna trgovina z oblacili za vse sezone
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-stone-600">
            Izberi izdelke po kategoriji, sezoni in ciljni skupini. Vse je povezano z bazo, zato
            je katalog vedno aktualen.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="bg-stone-800 px-4 py-2 text-xs uppercase tracking-widest text-white hover:bg-stone-900"
            >
              Odpri katalog
            </Link>
            {session?.user ? (
              <Link
                href="/dashboard"
                className="border border-stone-300 px-4 py-2 text-xs uppercase tracking-widest text-stone-600 hover:text-stone-800"
              >
                Moj dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="border border-stone-300 px-4 py-2 text-xs uppercase tracking-widest text-stone-600 hover:text-stone-800"
              >
                Ustvari racun
              </Link>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded border border-stone-200 bg-white p-6">
            <p className="text-xs uppercase tracking-widest text-stone-500">Aktivni izdelki</p>
            <p className="mt-2 text-3xl font-light text-stone-900">{activeProductsCount}</p>
          </article>
          <article className="rounded border border-stone-200 bg-white p-6">
            <p className="text-xs uppercase tracking-widest text-stone-500">Kategorije</p>
            <p className="mt-2 text-3xl font-light text-stone-900">{categoryCount}</p>
          </article>
          <article className="rounded border border-stone-200 bg-white p-6">
            <p className="text-xs uppercase tracking-widest text-stone-500">Ciljne skupine</p>
            <p className="mt-2 text-3xl font-light text-stone-900">{audienceCount}</p>
          </article>
        </section>

        <section className="rounded border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-medium text-stone-900">Hitri filtri</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-stone-500">Kategorije</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?categoryId=${category.id}`}
                    className="border border-stone-300 px-3 py-1 text-xs uppercase tracking-widest text-stone-600 hover:text-stone-800"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-stone-500">Sezone</p>
              <div className="flex flex-wrap gap-2">
                {seasons.map((season) => (
                  <Link
                    key={season.id}
                    href={`/products?seasonId=${season.id}`}
                    className="border border-stone-300 px-3 py-1 text-xs uppercase tracking-widest text-stone-600 hover:text-stone-800"
                  >
                    {season.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-stone-900">Najnovejsi izdelki</h2>
            <Link
              href="/products"
              className="text-xs uppercase tracking-widest text-stone-500 hover:text-stone-800"
            >
              Poglej vse
            </Link>
          </div>

          {latestProducts.length === 0 ? (
            <div className="rounded border border-stone-200 bg-white p-6 text-stone-500">
              Trenutno ni aktivnih izdelkov.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestProducts.map((product) => (
                <article key={product.id} className="rounded border border-stone-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-widest text-stone-500">
                    {product.category.name} · {product.season.name} · {product.audience.name}
                  </p>
                  <h3 className="mt-2 text-lg font-medium text-stone-900">{product.name}</h3>
                  <p className="mt-2 text-sm text-stone-600">{product.description || "Brez opisa."}</p>
                  <p className="mt-3 text-sm font-medium text-stone-900">{formatPrice(product.priceCents)}</p>
                  <p
                    className={
                      product.stock > 0
                        ? "mt-2 text-xs uppercase tracking-widest text-green-700"
                        : "mt-2 text-xs uppercase tracking-widest text-red-700"
                    }
                  >
                    {product.stock > 0 ? `Na zalogi: ${product.stock}` : "Ni na zalogi"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
