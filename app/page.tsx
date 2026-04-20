import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopBanner } from "./components/TopBanner";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function discountPct(price: number, compareAt: number) {
  return Math.round(((compareAt - price) / compareAt) * 100);
}

const HERO: Record<string, {
  image: string; imgPos: string; headline: string; sub: string; cta: string;
  features: { label: string; sub: string; img: string; categorySlugs: string[] }[];
}> = {
  moski: {
    image: "/MANS.png",
    imgPos: "center 20%",
    headline: "Nova kolekcija\nza moške",
    sub: "Odkrijte sveže stile za vsak dan — od casual do elegantnega.",
    cta: "Nakupuj moške kose",
    features: [
      { label: "Jakne & plašči", sub: "Za vsako vreme", img: "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=480&h=640&fit=crop&crop=center&q=80", categorySlugs: ["jakne"] },
      { label: "Majice & polo", sub: "Casual in elegantno", img: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=480&h=640&fit=crop&crop=center&q=80", categorySlugs: ["majice", "t-shirt"] },
      { label: "Hlače", sub: "Chino, cargo, jogger", img: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=480&h=640&fit=crop&crop=center&q=80", categorySlugs: ["hlace"] },
    ],
  },
  zenske: {
    image: "/WOMANS.png",
    imgPos: "center 20%",
    headline: "Moda za\nženske",
    sub: "Oblačila in obutev za vsak dan in vsako priložnost.",
    cta: "Nakupuj ženske kose",
    features: [
      { label: "Obleke & krila", sub: "Midi, maxi in mini", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=480&h=640&fit=crop&crop=top&q=80", categorySlugs: ["obleke"] },
      { label: "Petke & čevlji", sub: "Superge, škornji, petke", img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=480&h=640&fit=crop&crop=center&q=80", categorySlugs: ["obutev"] },
      { label: "Jakne & plašči", sub: "Jesenski in zimski slogi", img: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=480&h=640&fit=crop&crop=top&q=80", categorySlugs: ["jakne"] },
      { label: "Puloverji & jopici", sub: "Pleteno in mehko", img: "https://orsay.cdn.csagdev.cz/zoh4eiLi/IMG/31536000/H-61JhM_dSr4Nr327vYvgp31UvyC4MkyOvlDVyU1qYw/fill/3840/5116/sm/1/aHR0cHM6Ly9vcnNheS5jZG4tYmUuY3NhZ2Rldi5jei9jYXRhbG9nL2l0ZW0tcGljdHVyZXMvNGI5YzQzYzgtYzc0MC00ZjEzLWI1MWItM2RjNDM5MWRhYjc3ZjIwNjlhNjM1N2UyZmM2NGE3M2Y3NmIxZTZmMzhhOWYtMTU1ODM0LmpwZw==", categorySlugs: ["puloverji", "jopici"] },
      { label: "Majice & bluze", sub: "Casual in elegantno", img: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=480&h=640&fit=crop&crop=center&q=80", categorySlugs: ["srajce", "majice"] },
      { label: "Hlače", sub: "Ravne, palazzo, cargo", img: "https://images.unsplash.com/photo-1542219550-37153d387c27?w=480&h=640&fit=crop&crop=center&q=80", categorySlugs: ["hlace"] },
    ],
  },
  otroci: {
    image: "/KIDS.png",
    imgPos: "center 40%",
    headline: "Oblačila za\nnajmlajše",
    sub: "Udobno, veselo in vzdržljivo — za vsak dan.",
    cta: "Nakupuj otroške kose",
    features: [
      { label: "Jakne", sub: "Za igro in šolo", img: "https://img.modivo.cloud/product(0/e/5/8/0e58421fa6e7920c3514aec4efe9688aa6cd7b3e_01_0000303339739_RP.jpg,jpg)/didriksons-zimska-jakna-rodi-kids-jacket-2-504983-roza-0000303339739.jpg", categorySlugs: ["jakne"] },
      { label: "Majice", sub: "Pisane in udobne", img: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=480&h=640&fit=crop&crop=top&q=80", categorySlugs: ["majice", "t-shirt"] },
      { label: "Jopici", sub: "Toplo in kul", img: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=480&h=640&fit=crop&crop=top&q=80", categorySlugs: ["jopici"] },
    ],
  },
};

const CAT_IMG: Record<string, string> = {
  majice:    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&h=200&fit=crop&crop=center&q=80",
  "t-shirt": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop&crop=center&q=80",
  srajce:    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=200&h=200&fit=crop&crop=center&q=80",
  obleke:    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&h=200&fit=crop&crop=center&q=80",
  puloverji: "https://cdn.aboutstatic.com/file/images/6c1d7f60418538fb7d705576719e84e1.png?bg=F4F4F5&quality=75&trim=1&height=480&width=360",
  jopici:    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR00JGtpiDdHkddhE4PljyAulDSfJGHrLs8gA&s",
  hlace:     "https://images.unsplash.com/photo-1542219550-37153d387c27?w=200&h=200&fit=crop&crop=center&q=80",
  jakne:     "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=200&h=200&fit=crop&crop=center&q=80",
  kape:      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=200&h=200&fit=crop&crop=center&q=80",
  "pi-ama":  "https://cdn.aboutstatic.com/file/images/8dc49ac7b9d7af4dc0155a1cdc201e40.jpg?brightness=0.96&quality=75&trim=1&height=1067&width=800",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const audienceIdParam = Array.isArray(params.audienceId) ? params.audienceId[0] : (params.audienceId ?? "");

  // ── AUDIENCE LANDING ─────────────────────────────────────────────────────
  if (audienceIdParam) {
    const [audience, allCategories, latestProducts, saleProducts] = await Promise.all([
      prisma.audience.findUnique({ where: { id: audienceIdParam } }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { products: { where: { isActive: true, audienceId: audienceIdParam } } } } },
      }),
      prisma.product.findMany({
        where: { isActive: true, audienceId: audienceIdParam },
        orderBy: { createdAt: "desc" }, take: 4,
        include: { category: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { isActive: true, audienceId: audienceIdParam, compareAtPriceCents: { not: null } },
        orderBy: { createdAt: "desc" }, take: 4,
        include: { category: { select: { name: true } } },
      }),
    ]);

    if (audience) {
      type CategoryItem = (typeof allCategories)[0];
      type ProductItem = (typeof latestProducts)[0];
      const hero = HERO[audience.slug] ?? HERO["moski"];
      const visibleCategories = allCategories.filter((c: CategoryItem) => c._count.products > 0);
      const featureCategoryIds = (slugs: string[]) =>
        allCategories.filter((c: CategoryItem) => slugs.includes(c.slug)).map((c: CategoryItem) => c.id);

      return (
        <>
          <TopBanner id="spring-2026" message="Brezplačna dostava za naročila nad 80 € · Koda za 10% popusta: LESO10" />
          <main className="min-h-screen bg-white">

            {/* Hero — full-bleed image with overlay text */}
            <section className="relative overflow-hidden" style={{ minHeight: "88vh" }}>
              <img
                src={hero.image}
                alt={audience.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: hero.imgPos }}
              />
              {/* Multi-layer gradient for depth */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Text content */}
              <div className="relative h-full flex items-end pb-20 px-8 sm:px-16 max-w-7xl mx-auto" style={{ minHeight: "88vh" }}>
                <div className="fade-up max-w-lg">
                  <p className="text-xs tracking-[0.45em] uppercase text-white/60 mb-4 font-light">
                    {audience.name} · Kolekcija 2026
                  </p>
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.05] text-white tracking-tight whitespace-pre-line">
                    {hero.headline}
                  </h1>
                  <p className="mt-5 text-sm text-white/70 leading-relaxed max-w-sm">
                    {hero.sub}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <Link
                      href={`/products?audienceId=${audience.id}&group=oblacila`}
                      className="bg-white text-stone-900 px-10 py-3.5 text-xs tracking-widest uppercase font-medium hover:bg-stone-100 transition-colors"
                    >
                      {hero.cta}
                    </Link>
                    {saleProducts.length > 0 && (
                      <Link
                        href={`/products?audienceId=${audience.id}&sale=1`}
                        className="border border-white/60 text-white px-10 py-3.5 text-xs tracking-widest uppercase hover:bg-white/10 transition-colors"
                      >
                        Znižano →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Scroll hint */}
              <div className="absolute bottom-6 right-8 hidden sm:flex flex-col items-center gap-2 text-white/40">
                <div className="w-px h-12 bg-white/30" style={{ animation: "fadeUp 1.5s 0.5s ease both" }} />
                <span className="text-xs tracking-widest uppercase rotate-90 mt-2">Scroll</span>
              </div>
            </section>

            {/* Feature category cards */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-8 h-px bg-stone-900" />
                <p className="text-xs tracking-[0.4em] uppercase text-stone-500">Izpostavljeno</p>
              </div>
              <div className={`grid gap-3 ${hero.features.length > 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
                {hero.features.map((f, i) => {
                  const ids = featureCategoryIds(f.categorySlugs);
                  const href = ids.length > 0
                    ? `/products?audienceId=${audience.id}&categoryId=${ids[0]}`
                    : `/products?audienceId=${audience.id}`;
                  return (
                    <Link
                      key={f.label}
                      href={href}
                      className={`group relative overflow-hidden bg-stone-100 card-lift ${hero.features.length > 3 ? "aspect-[3/4]" : "aspect-[4/5]"}`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <img
                        src={f.img}
                        alt={f.label}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {/* Gradient overlay — deepens on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Text — slides up on hover */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
                        <p className="text-xs tracking-widest uppercase text-white/60 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{f.sub}</p>
                        <h3 className="text-xl font-light tracking-wide text-white">{f.label}</h3>
                        <div className="mt-3 overflow-hidden h-0 group-hover:h-8 transition-all duration-400">
                          <span className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-white/80 border-b border-white/40 pb-0.5">
                            Poglej kolekcijo →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Explore — circular category icons */}
            {visibleCategories.length > 0 && (
              <section className="border-t border-stone-100 bg-stone-50/50 py-14">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-8 h-px bg-stone-900" />
                    <p className="text-xs tracking-[0.4em] uppercase text-stone-500">Razišči našo trgovino</p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-6 sm:gap-8">
                    {visibleCategories.map((cat: CategoryItem) => (
                      <Link
                        key={cat.id}
                        href={`/products?audienceId=${audience.id}&categoryId=${cat.id}`}
                        className="group flex flex-col items-center gap-3 text-center"
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-stone-200 ring-2 ring-transparent group-hover:ring-stone-900 group-hover:ring-offset-2 transition-all duration-300 shadow-sm group-hover:shadow-lg">
                          <img
                            src={CAT_IMG[cat.slug] ?? `https://source.unsplash.com/200x200/?fashion,clothing&sig=${cat.id.slice(-3)}`}
                            alt={cat.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <span className="text-xs text-stone-500 group-hover:text-stone-900 transition-colors leading-tight font-medium">
                          {cat.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Latest products */}
            {latestProducts.length > 0 && (
              <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-8 h-px bg-stone-900" />
                      <p className="text-xs tracking-[0.4em] uppercase text-stone-400">Sveže v katalogu</p>
                    </div>
                    <h2 className="text-3xl font-light text-stone-900 tracking-tight">Novi prihodi</h2>
                  </div>
                  <Link href={`/products?audienceId=${audience.id}`} className="underline-grow text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                    Vse →
                  </Link>
                </div>
                <ProductGrid products={latestProducts as ProductItem[]} />
              </section>
            )}

            {/* Sale section */}
            {saleProducts.length > 0 && (
              <section className="bg-stone-900 py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                  <div className="flex items-end justify-between mb-8">
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-8 h-px bg-red-500" />
                        <p className="text-xs tracking-[0.4em] uppercase text-stone-500">Do –40%</p>
                      </div>
                      <h2 className="text-3xl font-light text-white tracking-tight">Sezonski popusti</h2>
                    </div>
                    <Link href={`/products?audienceId=${audience.id}&sale=1`} className="text-xs tracking-widest uppercase text-stone-400 hover:text-white transition-colors underline-grow">
                      Vse znižano →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-stone-700 sm:grid-cols-4">
                    {(saleProducts as ProductItem[]).map((p) => {
                      const pct = p.compareAtPriceCents ? discountPct(p.priceCents, p.compareAtPriceCents) : 0;
                      return (
                        <article key={p.id} className="group bg-stone-900 hover:bg-stone-800 transition-colors">
                          <div className="relative aspect-[3/4] bg-stone-800 overflow-hidden">
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-600" />
                              : <div className="h-full w-full flex items-center justify-center"><span className="text-xs text-stone-600 tracking-widest uppercase">Leso</span></div>
                            }
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-300" />
                            {pct > 0 && <span className="absolute top-3 left-3 bg-[#c41230] text-white text-xs font-bold px-2.5 py-1 tracking-wide">−{pct}%</span>}
                          </div>
                          <div className="p-4">
                            <p className="text-xs tracking-widest uppercase text-stone-500">{p.category.name}</p>
                            <h3 className="mt-1 text-sm font-medium text-white leading-snug line-clamp-2">{p.name}</h3>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-sm font-semibold text-red-400">{formatPrice(p.priceCents)}</span>
                              {p.compareAtPriceCents && <span className="text-xs text-stone-600 line-through">{formatPrice(p.compareAtPriceCents)}</span>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <Footer />
          </main>
        </>
      );
    }
  }

  // ── GENERAL LANDING ──────────────────────────────────────────────────────
  const [audiences, categories, latestProducts] = await Promise.all([
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }, take: 8,
      include: { category: { select: { name: true } }, audience: { select: { name: true } } },
    }),
  ]);

  type AudienceItem = (typeof audiences)[0];
  type CategoryItem2 = (typeof categories)[0];
  type ProductItem2 = (typeof latestProducts)[0];

  return (
    <>
      <TopBanner id="spring-2026" message="Brezplačna dostava za naročila nad 80 € · Koda za 10% popusta: LESO10" />
      <main className="min-h-screen bg-white">

        {/* Hero — 3-panel audience selector */}
        <section className="grid grid-cols-1 sm:grid-cols-3" style={{ height: "92vh" }}>
          {audiences.map((a: AudienceItem) => {
            const panelData: Record<string, { img: string; tint: string }> = {
              moski: {
                img: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800&h=1200&fit=crop&crop=faces,center&q=80",
                tint: "from-stone-900/80 via-stone-900/20",
              },
              zenske: {
                img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1200&fit=crop&crop=faces,top&q=80",
                tint: "from-stone-900/80 via-stone-900/20",
              },
              otroci: {
                img: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&h=1200&fit=crop&crop=faces,top&q=80",
                tint: "from-stone-900/80 via-stone-900/20",
              },
            };
            const panel = panelData[a.slug] ?? {
              img: `https://source.unsplash.com/800x1200/?fashion,${a.slug}&sig=${a.id.slice(-2)}`,
              tint: "from-stone-900/80 via-stone-900/20",
            };
            return (
              <Link
                key={a.id}
                href={`/?audienceId=${a.id}`}
                className="group relative flex items-end overflow-hidden bg-stone-900"
              >
                <img
                  src={panel.img}
                  alt={a.name}
                  className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                {/* Base gradient */}
                <div className={`absolute inset-0 bg-gradient-to-t ${panel.tint} to-transparent`} />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />

                <div className="relative w-full p-8 sm:p-10 pb-12">
                  <p className="text-xs tracking-[0.45em] uppercase text-white/50 mb-2">Nakupuj</p>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-[0.15em] uppercase text-white mb-5 group-hover:tracking-[0.25em] transition-all duration-500">
                    {a.name}
                  </h2>
                  <div className="overflow-hidden">
                    <span className="inline-flex items-center gap-3 border border-white/50 px-6 py-2.5 text-xs tracking-widest uppercase text-white translate-y-0 group-hover:bg-white group-hover:text-stone-900 group-hover:border-white transition-all duration-300">
                      Oglej si →
                    </span>
                  </div>
                </div>

                {/* Thin bottom accent line */}
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-500" />
              </Link>
            );
          })}
        </section>

        {/* Category grid */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-px bg-stone-900" />
              <h2 className="text-xs tracking-[0.4em] uppercase text-stone-500">Kategorije</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {categories.map((cat: CategoryItem2) => (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  className="group relative overflow-hidden border border-stone-200 p-3 text-center hover:border-stone-900 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-stone-900 scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform duration-300" />
                  <p className="relative text-xs font-medium text-stone-700 group-hover:text-white transition-colors duration-300">{cat.name}</p>
                  <p className="relative mt-0.5 text-xs text-stone-400 group-hover:text-stone-300 transition-colors duration-300">{cat._count.products}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Promo banner */}
        <section className="relative overflow-hidden bg-stone-900 text-white">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-xs tracking-[0.45em] uppercase text-stone-400 mb-2">Nova kolekcija 2026</p>
              <h2 className="text-4xl sm:text-5xl font-light leading-tight tracking-tight">
                Oblačila za<br /><em className="not-italic text-stone-300">vsako sezono</em>
              </h2>
              <p className="mt-4 text-sm text-stone-400 max-w-md leading-relaxed">
                Odkrijte našo kolekcijo skrbno izbranih oblačil za vsak stil in vsako priložnost.
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 group relative overflow-hidden bg-white px-12 py-4 text-xs tracking-widest uppercase text-stone-900 hover:text-white transition-colors duration-300"
            >
              <span className="absolute inset-0 bg-stone-700 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              <span className="relative">Celoten katalog →</span>
            </Link>
          </div>
        </section>

        {/* Latest products */}
        {latestProducts.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-8 h-px bg-stone-900" />
                  <p className="text-xs tracking-[0.4em] uppercase text-stone-400">Sveže v katalogu</p>
                </div>
                <h2 className="text-3xl font-light text-stone-900 tracking-tight">Novi prihodi</h2>
              </div>
              <Link href="/products" className="underline-grow text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                Vse →
              </Link>
            </div>
            <ProductGrid products={latestProducts as ProductItem2[]} />
          </section>
        )}

        <Footer />
      </main>
    </>
  );
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────

type AnyProduct = {
  id: string; name: string; slug: string; imageUrl: string | null;
  priceCents: number; compareAtPriceCents: number | null;
  category: { name: string };
};

function ProductGrid({ products }: { products: AnyProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-stone-100 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => {
        const pct = p.compareAtPriceCents ? discountPct(p.priceCents, p.compareAtPriceCents) : 0;
        return (
          <article key={p.id} className="group relative bg-white">
            <Link href={`/products/${p.slug}`} className="absolute inset-0 z-0" tabIndex={-1} aria-label={p.name} />
            <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
              {p.imageUrl
                ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108" style={{ transitionTimingFunction: "cubic-bezier(0.25,0.46,0.45,0.94)" }} />
                : <div className="h-full w-full flex items-center justify-center"><span className="text-xs tracking-widest uppercase text-stone-300">Leso</span></div>
              }
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-all duration-400" />
              {pct > 0 && (
                <span className="absolute top-3 left-3 bg-[#c41230] text-white text-xs font-bold px-2.5 py-1 tracking-wide">
                  −{pct}%
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs tracking-widest uppercase text-stone-400">{p.category.name}</p>
              <h3 className="mt-1 text-sm font-medium text-stone-900 leading-snug line-clamp-2">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-sm font-semibold ${pct > 0 ? "text-[#c41230]" : "text-stone-800"}`}>
                  {formatPrice(p.priceCents)}
                </span>
                {p.compareAtPriceCents && (
                  <span className="text-xs text-stone-400 line-through">{formatPrice(p.compareAtPriceCents)}</span>
                )}
              </div>
            </div>
            {/* Bottom border accent on hover */}
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-stone-900 group-hover:w-full transition-all duration-400" />
          </article>
        );
      })}
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-2xl font-light tracking-[0.6em] uppercase text-white">Leso</span>
            <p className="mt-4 text-sm leading-relaxed text-stone-500">Oblačila za vsak stil in vsako priložnost. Brezplačna dostava nad 80 €.</p>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-300 mb-5">Pomoč strankam</p>
            <ul className="space-y-2.5 text-sm">
              {[["Katalog", "/products"], ["Dostava & vračila", "#"], ["Pogoji poslovanja", "#"], ["Politika zasebnosti", "#"]].map(([l, h]) => (
                <li key={l}><Link href={h} className="underline-grow hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-300 mb-5">Moj račun</p>
            <ul className="space-y-2.5 text-sm">
              {[["Prijava", "/login"], ["Registracija", "/register"], ["Moja naročila", "/orders"], ["Košarica", "/cart"]].map(([l, h]) => (
                <li key={l}><Link href={h} className="underline-grow hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-300 mb-5">Sledite nam</p>
            <div className="flex gap-5">
              {[
                { label: "Instagram", href: "https://instagram.com", d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                { label: "TikTok", href: "https://tiktok.com", d: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" },
                { label: "Facebook", href: "https://facebook.com", d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
              ].map(({ label, href, d }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="text-stone-500 hover:text-white transition-colors hover:-translate-y-0.5 transform duration-200 inline-block">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d={d} /></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-stone-800 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-600 mb-3">Načini plačila</p>
            <div className="flex flex-wrap gap-2">
              {["VISA", "Mastercard", "PayPal", "Apple Pay", "Klarna"].map((m) => (
                <span key={m} className="border border-stone-700 px-2.5 py-1 text-xs text-stone-400 rounded-sm hover:border-stone-500 transition-colors">{m}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-600 mb-3">Dostava</p>
            <div className="flex flex-wrap gap-2">
              {["DHL", "Pošta Slovenije", "GLS"].map((d) => (
                <span key={d} className="border border-stone-700 px-2.5 py-1 text-xs text-stone-400 rounded-sm hover:border-stone-500 transition-colors">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-stone-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600">
          <p>© 2026 Leso. Vse pravice pridržane.</p>
          <p>Cene so prikazane z DDV. Brezplačna dostava nad 80 €.</p>
        </div>
      </div>
    </footer>
  );
}
