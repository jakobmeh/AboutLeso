import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WishlistButton } from "@/app/components/WishlistButton";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, priceCents: true,
          compareAtPriceCents: true, imageUrl: true, isActive: true,
          variants: { where: { isActive: true, stock: { gt: 0 } }, select: { size: true } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-light tracking-tight text-stone-900 mb-8">Priljubljeni izdelki</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-sm mb-6">Še nimate shranjenih izdelkov.</p>
            <Link href="/products"
              className="text-xs tracking-widest uppercase bg-stone-900 text-white px-8 py-3 hover:bg-stone-700 transition-colors">
              Brskaj po izdelkih
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map(({ product }) => {
              const pct = product.compareAtPriceCents
                ? Math.round(((product.compareAtPriceCents - product.priceCents) / product.compareAtPriceCents) * 100)
                : 0;
              const inStock = product.variants.length > 0;

              return (
                <div key={product.id} className="group relative">
                  <Link href={`/products/${product.slug}`} className="block">
                    <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden mb-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <span className="text-xs tracking-[0.3em] text-stone-300">LESO</span>
                        </div>
                      )}
                      {pct > 0 && (
                        <span className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1" style={{ background: "#c41230" }}>
                          -{pct}%
                        </span>
                      )}
                      {!inStock && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                          <span className="text-xs tracking-widest uppercase text-stone-400">Razprodano</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-stone-800 line-clamp-1">{product.name}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm" style={pct > 0 ? { color: "#c41230" } : { color: "#1c1917" }}>
                        {formatPrice(product.priceCents)}
                      </span>
                      {product.compareAtPriceCents && (
                        <span className="text-xs text-stone-400 line-through">{formatPrice(product.compareAtPriceCents)}</span>
                      )}
                    </div>
                    {inStock && (
                      <p className="text-xs text-stone-400 mt-1">
                        {product.variants.map((v) => v.size).join(", ")}
                      </p>
                    )}
                  </Link>
                  <div className="absolute top-2 right-2">
                    <WishlistButton productId={product.id} initialSaved={true}
                      className="w-8 h-8 bg-white/90 rounded-full shadow hover:bg-white" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
