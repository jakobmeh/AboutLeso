import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SizePicker } from "./SizePicker";
import { ViewTracker } from "./ViewTracker";
import { WishlistButton } from "@/app/components/WishlistButton";
import { ReviewSection } from "@/app/components/ReviewSection";
import { RecentlyViewed } from "@/app/components/RecentlyViewed";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function discountPct(price: number, compareAt: number) {
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [product, wishlistIds] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        season: true,
        audience: true,
        variants: { where: { isActive: true }, orderBy: { size: "asc" } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        },
      },
    }),
    userId
      ? prisma.wishlist.findMany({ where: { userId }, select: { productId: true } })
      : Promise.resolve([]),
  ]);

  if (!product || !product.isActive) notFound();

  type ProductVariantItem = (typeof product.variants)[number];
  type ReviewItem = (typeof product.reviews)[number];

  const pct = product.compareAtPriceCents
    ? discountPct(product.priceCents, product.compareAtPriceCents)
    : 0;

  const totalStock = product.variants.reduce(
    (s: number, v: ProductVariantItem) => s + v.stock, 0
  );

  const savedIds = new Set(wishlistIds.map((w: { productId: string }) => w.productId));
  const isSaved = savedIds.has(product.id);

  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((s: number, r: ReviewItem) => s + r.rating, 0) / product.reviews.length
    : 0;

  const userReview = userId
    ? (product.reviews.find((r: ReviewItem) => r.userId === userId) ?? null)
    : null;

  const hasPurchased = userId
    ? (await prisma.orderItem.findFirst({
        where: { productId: product.id, order: { userId } },
      })) !== null
    : false;

  return (
    <div className="min-h-screen bg-white">
      <ViewTracker slug={slug} />

      {/* Breadcrumb */}
      <div className="border-b border-stone-100 bg-stone-50/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
          <nav className="text-xs text-stone-400 flex items-center gap-1.5">
            <Link href="/" className="hover:text-stone-700 transition-colors">Domov</Link>
            <span className="text-stone-300">/</span>
            {product.audience && (
              <>
                <Link href={`/products?audienceId=${product.audience.id}`} className="hover:text-stone-700 transition-colors">
                  {product.audience.name}
                </Link>
                <span className="text-stone-300">/</span>
              </>
            )}
            <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-stone-700 transition-colors">
              {product.category.name}
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-600 font-medium line-clamp-1">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-2xl font-light tracking-[0.5em] uppercase text-stone-300">Leso</span>
              </div>
            )}
            {pct > 0 && (
              <span className="absolute top-4 left-4 text-white text-sm font-bold px-3 py-1.5 tracking-wide" style={{ background: "#c41230" }}>
                -{pct}%
              </span>
            )}
            {totalStock === 0 && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <span className="text-xs tracking-widest uppercase text-stone-500 border border-stone-300 px-6 py-3">
                  Razprodano
                </span>
              </div>
            )}
            {/* Wishlist on image */}
            {userId && (
              <div className="absolute top-4 right-4">
                <WishlistButton
                  productId={product.id}
                  initialSaved={isSaved}
                  className="w-9 h-9 bg-white/90 rounded-full shadow hover:bg-white"
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-start justify-between">
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400">
                {product.category.name}
                {product.season && <span className="ml-3 text-stone-300">· {product.season.name}</span>}
              </p>
              {/* Stars summary */}
              {product.reviews.length > 0 && (
                <div className="flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#1c1917" stroke="#1c1917" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="text-xs text-stone-500">{avgRating.toFixed(1)} ({product.reviews.length})</span>
                </div>
              )}
            </div>

            <h1 className="mt-3 text-3xl sm:text-4xl font-light tracking-tight text-stone-900 leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-2xl font-semibold" style={pct > 0 ? { color: "#c41230" } : { color: "#1c1917" }}>
                {formatPrice(product.priceCents)}
              </span>
              {product.compareAtPriceCents && (
                <span className="text-base text-stone-400 line-through">{formatPrice(product.compareAtPriceCents)}</span>
              )}
              {pct > 0 && (
                <span className="text-sm font-medium" style={{ color: "#c41230" }}>
                  Prihraniš {formatPrice(product.compareAtPriceCents! - product.priceCents)}
                </span>
              )}
            </div>

            {product.description && (
              <p className="mt-6 text-sm text-stone-500 leading-relaxed">{product.description}</p>
            )}

            <div className="mt-8 border-t border-stone-100" />

            <SizePicker
              variants={product.variants}
              isLoggedIn={!!userId}
              userEmail={session?.user?.email ?? null}
            />

            {/* Meta */}
            <div className="mt-8 pt-6 border-t border-stone-100 space-y-2 text-xs text-stone-400">
              <div className="flex gap-3">
                <span className="tracking-widest uppercase">Kategorija</span>
                <Link href={`/products?categoryId=${product.category.id}`}
                  className="text-stone-600 hover:text-stone-900 transition-colors underline underline-offset-2">
                  {product.category.name}
                </Link>
              </div>
              {product.audience && (
                <div className="flex gap-3">
                  <span className="tracking-widest uppercase">Za</span>
                  <Link href={`/products?audienceId=${product.audience.id}`}
                    className="text-stone-600 hover:text-stone-900 transition-colors underline underline-offset-2">
                    {product.audience.name}
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-8">
              <Link href="/products"
                className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-700 transition-colors underline underline-offset-4">
                ← Nazaj v katalog
              </Link>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <ReviewSection
          productId={product.id}
          reviews={product.reviews}
          avgRating={avgRating}
          isLoggedIn={!!userId}
          userReview={userReview}
          hasPurchased={hasPurchased}
        />

        {/* Recently viewed */}
        <RecentlyViewed currentSlug={slug} />
      </div>
    </div>
  );
}
