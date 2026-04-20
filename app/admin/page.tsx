import { Role } from "@/app/generated/prisma/client";
import {
  createAudience,
  createCategory,
  createSeason,
  deleteAudience,
  deleteCategory,
  deleteSeason,
} from "@/app/actions/admin-taxonomy";
import {
  createProduct,
  deleteProduct,
  toggleProductActive,
  updateProduct,
  setProductDiscount,
  setBulkDiscount,
} from "@/app/actions/admin-products";
import {
  assignCreatorCode,
  deactivateCreatorCode,
  revokeCreatorCode,
  searchCreatorUser,
} from "@/app/actions/admin-creator";
import { setTrackingNumber, setOrderStatus } from "@/app/actions/admin-orders";
import { requireRole } from "@/lib/authz";
import { formatVariantStocks, totalVariantStock } from "@/lib/product-variants";
import { prisma } from "@/lib/prisma";
import { Fragment } from "react";

type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  variants: { id: string; size: string; stock: number; isActive: boolean }[];
  categoryId: string;
  seasonId: string;
  audienceId: string;
  isActive: boolean;
  category: { name: string };
  season: { name: string };
  audience: { name: string };
};

type SearchParamsInput = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} EUR`;
}

function BarChart({
  data,
  barColor = "#292524",
  labelEvery = 1,
}: {
  data: { label: string; value: number }[];
  barColor?: string;
  labelEvery?: number;
}) {
  if (data.every((d) => d.value === 0)) {
    return <p className="py-6 text-center text-sm text-stone-400">Ni podatkov za ta period.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600, H = 140, PB = 18;
  const chartH = H - PB;
  const barStep = W / Math.max(data.length, 1);
  const barW = Math.max(2, barStep - 3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <line x1={0} y1={chartH} x2={W} y2={chartH} stroke="#e7e5e4" />
      {data.map((d, i) => {
        const bh = d.value > 0 ? Math.max(2, (d.value / max) * chartH) : 0;
        const x = i * barStep + (barStep - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={chartH - bh} width={barW} height={bh} fill={barColor} rx="1" />
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H - 3} textAnchor="middle" fontSize="8" fill="#a8a29e">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function TaxonomySection({
  title,
  placeholder,
  items,
  createAction,
  deleteAction,
}: {
  title: string;
  placeholder: string;
  items: TaxonomyItem[];
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="rounded border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-medium text-stone-800">{title}</h2>

      <form action={createAction} className="mt-4 flex gap-3">
        <input
          type="text"
          name="name"
          required
          className="flex-1 border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          placeholder={placeholder}
        />
        <button
          type="submit"
          className="bg-stone-800 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-900"
        >
          Add
        </button>
      </form>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Slug</th>
              <th className="py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-stone-400">
                  No items yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-stone-100">
                  <td className="py-3 pr-4 text-stone-800">{item.name}</td>
                  <td className="py-3 pr-4 text-stone-500">{item.slug}</td>
                  <td className="py-3 text-right">
                    <form action={deleteAction} className="inline">
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="text-xs tracking-widest uppercase text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductSection({
  products,
  categories,
  seasons,
  audiences,
}: {
  products: ProductRow[];
  categories: TaxonomyItem[];
  seasons: TaxonomyItem[];
  audiences: TaxonomyItem[];
}) {
  const taxonomiesReady =
    categories.length > 0 && seasons.length > 0 && audiences.length > 0;

  return (
    <section className="rounded border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-medium text-stone-800">Products</h2>

      {!taxonomiesReady ? (
        <p className="mt-4 text-sm text-amber-700">
          Add at least one category, season, and audience before creating products.
        </p>
      ) : (
        <form action={createProduct} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            name="name"
            required
            placeholder="Product name"
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <input
            type="text"
            name="imageUrl"
            placeholder="Slika URL (https://...)"
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <input
            type="number"
            name="price"
            min="0.01"
            step="0.01"
            required
            placeholder="Cena (EUR)"
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <input
            type="number"
            name="compareAtPrice"
            min="0.01"
            step="0.01"
            placeholder="Orig. cena za popust (neobvezno)"
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <input
            type="number"
            name="stock"
            min="0"
            step="1"
            required
            defaultValue={0}
            placeholder="Privzeta zaloga (UNI)"
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <input
            type="text"
            name="variantStocks"
            placeholder="Velikosti npr. XS:4,S:8,M:10,L:3"
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <select
            name="categoryId"
            required
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          >
            <option value="">Select category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            name="seasonId"
            required
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          >
            <option value="">Select season</option>
            {seasons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            name="audienceId"
            required
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          >
            <option value="">Select audience</option>
            {audiences.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            rows={3}
            placeholder="Description (optional)"
            className="md:col-span-2 border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="isActive" defaultChecked />
            Active product
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-stone-800 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-900"
            >
              Add product
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Slika</th>
              <th className="py-2 pr-4 font-medium">Price</th>
              <th className="py-2 pr-4 font-medium">Velikosti/Zaloga</th>
              <th className="py-2 pr-4 font-medium">Category</th>
              <th className="py-2 pr-4 font-medium">Season</th>
              <th className="py-2 pr-4 font-medium">Audience</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-4 text-stone-400">
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-b border-stone-100">
                    <td className="py-3 pr-4 text-stone-800">{item.name}</td>
                    <td className="py-3 pr-4">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-12 w-12 rounded border border-stone-200 object-cover"
                        />
                      ) : (
                        <span className="text-xs text-stone-400">Brez slike</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-stone-700">{formatPrice(item.priceCents)}</td>
                    <td className="py-3 pr-4 text-stone-700">
                      <p className="font-medium">Skupaj: {totalVariantStock(item.variants)}</p>
                      <p className="text-xs text-stone-500">{formatVariantStocks(item.variants)}</p>
                    </td>
                    <td className="py-3 pr-4 text-stone-700">{item.category.name}</td>
                    <td className="py-3 pr-4 text-stone-700">{item.season.name}</td>
                    <td className="py-3 pr-4 text-stone-700">{item.audience.name}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          item.isActive
                            ? "text-xs tracking-widest uppercase text-green-700"
                            : "text-xs tracking-widest uppercase text-stone-500"
                        }
                      >
                        {item.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <form action={toggleProductActive}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="text-xs tracking-widest uppercase text-stone-600 hover:text-stone-800"
                          >
                            Toggle
                          </button>
                        </form>
                        <form action={deleteProduct}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="text-xs tracking-widest uppercase text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <td colSpan={9} className="px-3 py-3">
                      <form action={updateProduct} className="grid grid-cols-1 gap-2 md:grid-cols-7">
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="text"
                          name="name"
                          defaultValue={item.name}
                          required
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <input
                          type="text"
                          name="imageUrl"
                          defaultValue={item.imageUrl ?? ""}
                          placeholder="Slika URL"
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <input
                          type="number"
                          name="price"
                          min="0.01"
                          step="0.01"
                          defaultValue={(item.priceCents / 100).toFixed(2)}
                          required
                          placeholder="Cena"
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <input
                          type="number"
                          name="compareAtPrice"
                          min="0.01"
                          step="0.01"
                          defaultValue={item.compareAtPriceCents ? (item.compareAtPriceCents / 100).toFixed(2) : ""}
                          placeholder="Orig. cena"
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <input
                          type="number"
                          name="stock"
                          min="0"
                          step="1"
                          defaultValue={totalVariantStock(item.variants)}
                          required
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <input
                          type="text"
                          name="variantStocks"
                          defaultValue={formatVariantStocks(item.variants)}
                          placeholder="S:5,M:8,L:3"
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <select
                          name="categoryId"
                          defaultValue={item.categoryId}
                          required
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="seasonId"
                          defaultValue={item.seasonId}
                          required
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        >
                          {seasons.map((season) => (
                            <option key={season.id} value={season.id}>
                              {season.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="audienceId"
                          defaultValue={item.audienceId}
                          required
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        >
                          {audiences.map((audience) => (
                            <option key={audience.id} value={audience.id}>
                              {audience.name}
                            </option>
                          ))}
                        </select>
                        <textarea
                          name="description"
                          rows={2}
                          defaultValue={item.description ?? ""}
                          placeholder="Description"
                          className="md:col-span-6 border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <label className="flex items-center gap-2 text-xs text-stone-700">
                          <input type="checkbox" name="isActive" defaultChecked={item.isActive} />
                          Active
                        </label>
                        <div className="md:col-span-6">
                          <button
                            type="submit"
                            className="bg-stone-800 px-3 py-1 text-xs tracking-widest uppercase text-white hover:bg-stone-900"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const session = await requireRole([Role.ADMIN]);
  const resolved = await searchParams;
  const section = one(resolved.section) || "products";
  const errorMessage = one(resolved.error).trim();
  const successMessage = one(resolved.success).trim();
  const lookupEmail = one(resolved.lookup).trim();

  const [categories, seasons, audiences, products, creatorCodes, allOrders] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.season.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        season: { select: { name: true } },
        audience: { select: { name: true } },
        variants: {
          select: { id: true, size: true, stock: true, isActive: true },
          orderBy: { size: "asc" },
        },
      },
    }),
    prisma.creatorCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { productName: true, productSize: true, quantity: true } },
      },
    }),
  ]);

  type CreatorCodeRow = (typeof creatorCodes)[0];

  let lookupUser: { id: string; email: string; name: string | null; role: Role; creatorCode: { code: string; discountPercent: number; commissionPercent: number; expiresAt: Date | null } | null } | null = null;
  if (lookupEmail) {
    lookupUser = await prisma.user.findUnique({
      where: { email: lookupEmail },
      select: { id: true, email: true, name: true, role: true, creatorCode: { select: { code: true, discountPercent: true, commissionPercent: true, expiresAt: true } } },
    });
  }

  // Analytics data — fetched only when on that tab
  type AnalyticsOrder = {
    createdAt: Date;
    totalCents: number;
    status: string;
    items: { productName: string; quantity: number }[];
  };
  let analyticsOrders: AnalyticsOrder[] = [];
  if (section === "analitika") {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    analyticsOrders = await prisma.order.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        totalCents: true,
        status: true,
        items: { select: { productName: true, quantity: true } },
      },
    });
  }

  const analyticsDaily: { label: string; revCents: number; count: number }[] = [];
  if (section === "analitika") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      analyticsDaily.push({
        label: d.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit" }),
        revCents: 0,
        count: 0,
      });
    }
    for (const o of analyticsOrders) {
      if (o.status !== "CANCELLED") {
        const dateStr = o.createdAt.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit" });
        const day = analyticsDaily.find((d) => d.label === dateStr);
        if (day) { day.revCents += o.totalCents; day.count++; }
      }
    }
  }
  const analyticsNonCancelled = analyticsOrders.filter((o) => o.status !== "CANCELLED");
  const analyticsRevTotal = analyticsDaily.reduce(
    (sum: number, day: (typeof analyticsDaily)[number]) => sum + day.revCents,
    0
  );
  const analyticsOrdersTotal = analyticsNonCancelled.length;
  const analyticsAvgOrder = analyticsOrdersTotal > 0 ? Math.round(analyticsRevTotal / analyticsOrdersTotal) : 0;
  type AdminOrderRow = (typeof allOrders)[number];
  const analyticsStatusCounts = section === "analitika"
    ? allOrders.reduce((acc: Record<string, number>, order: AdminOrderRow) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {} as Record<string, number>;
  const analyticsTopProducts: [string, number][] = [];
  if (section === "analitika") {
    const sales: Record<string, number> = {};
    for (const o of analyticsNonCancelled) {
      for (const item of o.items) {
        sales[item.productName] = (sales[item.productName] || 0) + item.quantity;
      }
    }
    analyticsTopProducts.push(...Object.entries(sales).sort(([, a], [, b]) => b - a).slice(0, 5));
  }

  const tabs = [
    { key: "products", label: "Izdelki" },
    { key: "orders", label: "Naročila" },
    { key: "creators", label: "Kreatorji" },
    { key: "popusti", label: "Popusti" },
    { key: "analitika", label: "Analitika" },
    { key: "taxonomy", label: "Taksonomija" },
  ];

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-12">
      <main className="mx-auto max-w-6xl space-y-6">
        <section className="rounded border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-800">
            Admin Panel
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {session.user.name ?? session.user.email}
          </p>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-200">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={`/admin?section=${t.key}`}
              className={`px-5 py-2.5 text-xs tracking-widest uppercase transition-colors ${
                section === t.key
                  ? "border-b-2 border-stone-900 text-stone-900 font-medium"
                  : "text-stone-400 hover:text-stone-700"
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        {/* Notifications */}
        {errorMessage && (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage === "invalid" && "Neveljavni podatki. Koda mora biti 2–20 znakov (A-Z, 0-9)."}
            {errorMessage === "code_taken" && "Ta koda je že zasedena. Izberi drugo."}
            {!["invalid", "code_taken"].includes(errorMessage) && errorMessage}
          </p>
        )}
        {successMessage === "1" && section === "creators" && (
          <p className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Kreator koda uspešno dodeljena.
          </p>
        )}

        {/* Products section */}
        {section === "products" && (
          <ProductSection
            products={products}
            categories={categories}
            seasons={seasons}
            audiences={audiences}
          />
        )}

        {/* Creators section */}
        {section === "creators" && (
          <section className="rounded border border-stone-200 bg-white p-6 space-y-8">
            <h2 className="text-lg font-medium text-stone-800">Upravljanje kreatorjev</h2>

            {/* Search */}
            <div>
              <h3 className="text-xs tracking-widest uppercase text-stone-400 mb-3">Poišči uporabnika po e-mailu</h3>
              <form action={searchCreatorUser} className="flex gap-3">
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={lookupEmail}
                  placeholder="uporabnik@email.com"
                  className="flex-1 border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
                />
                <button
                  type="submit"
                  className="bg-stone-800 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-900"
                >
                  Išči
                </button>
              </form>
            </div>

            {/* Lookup result */}
            {lookupEmail && (
              <div className="border border-stone-200 p-5">
                {lookupUser ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <p className="text-xs tracking-widest uppercase text-stone-400">Ime</p>
                        <p className="mt-0.5 text-stone-800">{lookupUser.name ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest uppercase text-stone-400">E-mail</p>
                        <p className="mt-0.5 text-stone-800">{lookupUser.email}</p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest uppercase text-stone-400">Vloga</p>
                        <p className="mt-0.5 font-medium text-stone-800">{lookupUser.role}</p>
                      </div>
                    </div>

                    <form action={assignCreatorCode} className="grid grid-cols-1 gap-3 md:grid-cols-5">
                      <input type="hidden" name="userId" value={lookupUser.id} />
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1">Koda</label>
                        <input
                          type="text"
                          name="code"
                          required
                          defaultValue={lookupUser.creatorCode?.code ?? ""}
                          placeholder="JAKOB10"
                          className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 uppercase outline-none focus:border-stone-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1">Popust kupca (%)</label>
                        <input
                          type="number"
                          name="discountPercent"
                          required
                          min={0}
                          max={80}
                          defaultValue={lookupUser.creatorCode?.discountPercent ?? 10}
                          className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1">Provizija kreatorja (%)</label>
                        <input
                          type="number"
                          name="commissionPercent"
                          required
                          min={0}
                          max={50}
                          defaultValue={lookupUser.creatorCode?.commissionPercent ?? 5}
                          className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1">Velja do (neobvezno)</label>
                        <input
                          type="date"
                          name="expiresAt"
                          defaultValue={lookupUser.creatorCode?.expiresAt ? new Date(lookupUser.creatorCode.expiresAt).toISOString().split("T")[0] : ""}
                          className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full bg-stone-800 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-900"
                        >
                          {lookupUser.creatorCode ? "Posodobi kodo" : "Dodeli kodo"}
                        </button>
                      </div>
                    </form>

                    {lookupUser.creatorCode && lookupUser.role === "CREATOR" && (
                      <div className="flex gap-4">
                        <form action={deactivateCreatorCode}>
                          <input type="hidden" name="userId" value={lookupUser.id} />
                          <button
                            type="submit"
                            className="text-xs tracking-widest uppercase text-amber-600 hover:text-amber-700"
                          >
                            Končaj kodo predčasno
                          </button>
                        </form>
                        <form action={revokeCreatorCode}>
                          <input type="hidden" name="userId" value={lookupUser.id} />
                          <button
                            type="submit"
                            className="text-xs tracking-widest uppercase text-red-600 hover:text-red-700"
                          >
                            Prekliči kreator status
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400">Uporabnik z e-mailom <strong>{lookupEmail}</strong> ne obstaja.</p>
                )}
              </div>
            )}

            {/* All creator codes */}
            <div>
              <h3 className="text-xs tracking-widest uppercase text-stone-400 mb-3">Vsi kreatorji</h3>
              {creatorCodes.length === 0 ? (
                <p className="text-sm text-stone-400">Še ni kreatorjev.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-xs tracking-widest uppercase text-stone-400">
                        <th className="py-2 pr-4 font-medium">Kreator</th>
                        <th className="py-2 pr-4 font-medium">Koda</th>
                        <th className="py-2 pr-4 font-medium">Popust</th>
                        <th className="py-2 pr-4 font-medium">Provizija</th>
                        <th className="py-2 pr-4 font-medium">Naročil</th>
                        <th className="py-2 pr-4 font-medium">Velja do</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 pr-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {creatorCodes.map((row: CreatorCodeRow) => (
                        <tr key={row.id}>
                          <td className="py-3 pr-4 text-stone-800">
                            <p>{row.user.name ?? "—"}</p>
                            <p className="text-xs text-stone-400">{row.user.email}</p>
                          </td>
                          <td className="py-3 pr-4 font-mono text-stone-700">{row.code}</td>
                          <td className="py-3 pr-4 text-stone-700">{row.discountPercent}%</td>
                          <td className="py-3 pr-4 text-stone-700">{row.commissionPercent}%</td>
                          <td className="py-3 pr-4 text-stone-700">{row._count.orders}</td>
                          <td className="py-3 pr-4 text-stone-600 text-xs">
                            {row.expiresAt
                              ? new Date(row.expiresAt).toLocaleDateString("sl-SI")
                              : <span className="text-stone-300">—</span>}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs tracking-widest uppercase font-medium ${row.isActive ? "text-green-700" : "text-red-500"}`}>
                              {row.isActive ? "Aktivna" : "Neaktivna"}
                            </span>
                          </td>
                          <td className="py-3">
                            {row.isActive && (
                              <form action={deactivateCreatorCode}>
                                <input type="hidden" name="userId" value={row.user.id} />
                                <button
                                  type="submit"
                                  className="text-xs tracking-widest uppercase text-amber-600 hover:text-amber-700 whitespace-nowrap"
                                >
                                  Končaj
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Orders section */}
        {section === "orders" && (() => {
          type AdminOrder = (typeof allOrders)[0];
          const STATUS_LABELS: Record<string, string> = {
            PENDING: "Čakanje na pregled",
            CONFIRMED: "Potrjeno",
            PREPARING: "Pripravljeno za pošiljanje",
            SHIPPED: "V dostavi",
            DELIVERED: "Dostavljeno",
            CANCELLED: "Preklicano",
          };
          const STATUS_COLORS: Record<string, string> = {
            PENDING: "bg-amber-50 text-amber-700 border-amber-200",
            CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
            PREPARING: "bg-purple-50 text-purple-700 border-purple-200",
            SHIPPED: "bg-cyan-50 text-cyan-700 border-cyan-200",
            DELIVERED: "bg-green-50 text-green-700 border-green-200",
            CANCELLED: "bg-red-50 text-red-600 border-red-200",
          };
          return (
            <section className="rounded border border-stone-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-stone-800">Naročila ({allOrders.length})</h2>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <span key={key} className={`text-xs px-2 py-0.5 border rounded-full ${STATUS_COLORS[key]}`}>{label}</span>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs tracking-widest uppercase text-stone-400">
                      <th className="py-2 pr-3 font-medium">ID / Stranka</th>
                      <th className="py-2 pr-3 font-medium">Datum</th>
                      <th className="py-2 pr-3 font-medium">Znesek</th>
                      <th className="py-2 pr-3 font-medium">Artikli</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Tracking DPD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {allOrders.map((order: AdminOrder) => (
                      <tr key={order.id} className="hover:bg-stone-50/50">
                        <td className="py-3 pr-3">
                          <p className="font-mono text-xs text-stone-400">{order.id.slice(0, 10)}…</p>
                          <p className="text-xs text-stone-800 font-medium mt-0.5">{order.user.name ?? "—"}</p>
                          <p className="text-xs text-stone-400">{order.user.email}</p>
                        </td>
                        <td className="py-3 pr-3 text-xs text-stone-600 whitespace-nowrap">
                          {new Intl.DateTimeFormat("sl-SI", { dateStyle: "short", timeStyle: "short" }).format(order.createdAt)}
                        </td>
                        <td className="py-3 pr-3 text-xs font-semibold text-stone-800 whitespace-nowrap">
                          {(order.totalCents / 100).toFixed(2)} €
                        </td>
                        <td className="py-3 pr-3 text-xs text-stone-500 max-w-[180px]">
                          {order.items.map((i: { productName: string; productSize: string | null; quantity: number }) =>
                            `${i.productName} (${i.productSize ?? "?"}) ×${i.quantity}`
                          ).join(", ")}
                        </td>
                        <td className="py-3 pr-3">
                          <form action={setOrderStatus} className="flex items-center gap-1">
                            <input type="hidden" name="orderId" value={order.id} />
                            <select name="status" defaultValue={order.status}
                              className="border border-stone-200 px-2 py-1 text-xs outline-none bg-white text-stone-700 min-w-[160px]">
                              <option value="PENDING">Čakanje na pregled</option>
                              <option value="CONFIRMED">Potrjeno</option>
                              <option value="PREPARING">Pripravljeno za pošiljanje</option>
                              <option value="SHIPPED">V dostavi</option>
                              <option value="DELIVERED">Dostavljeno</option>
                              <option value="CANCELLED">Preklicano</option>
                            </select>
                            <button type="submit" className="text-xs bg-stone-800 text-white px-2 py-1.5 hover:bg-stone-900">✓</button>
                          </form>
                          <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 border ${STATUS_COLORS[order.status] ?? ""}`}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <form action={setTrackingNumber} className="flex items-center gap-1">
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="text" name="trackingNumber" defaultValue={order.trackingNumber ?? ""}
                              placeholder="DPD številka"
                              className="border border-stone-200 px-2 py-1 text-xs w-28 outline-none focus:border-stone-500" />
                            <button type="submit" className="text-xs bg-stone-800 text-white px-2 py-1.5 hover:bg-stone-900">✓</button>
                          </form>
                          {order.trackingNumber && (
                            <a href={`https://tracking.dpd.de/status/sl_SI/parcel/${order.trackingNumber}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 block">
                              Sledi ↗
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })()}

        {/* Taxonomy section */}
        {section === "taxonomy" && (
          <>
            <TaxonomySection
              title="Categories"
              placeholder="Example: T-Shirts"
              items={categories}
              createAction={createCategory}
              deleteAction={deleteCategory}
            />
            <TaxonomySection
              title="Seasons"
              placeholder="Example: Summer"
              items={seasons}
              createAction={createSeason}
              deleteAction={deleteSeason}
            />
            <TaxonomySection
              title="Audiences"
              placeholder="Example: Men"
              items={audiences}
              createAction={createAudience}
              deleteAction={deleteAudience}
            />
          </>
        )}
        {/* Discounts section */}
        {section === "popusti" && (
          <div className="space-y-6">
            {/* Bulk discount */}
            <section className="rounded border border-stone-200 bg-white p-6 space-y-5">
              <h2 className="text-lg font-medium text-stone-800">Skupinski popust</h2>
              <p className="text-xs text-stone-400">Nastavi popust na vse izdelke ali samo na določeno kategorijo. Originalna cena se shrani in jo lahko kadarkoli povrneš.</p>
              <form action={setBulkDiscount} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1">Kategorija</label>
                  <select name="categoryId" className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600 min-w-[160px]">
                    <option value="all">Vse kategorije</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1">Popust (%)</label>
                  <input type="number" name="discountPercent" min={0} max={80} defaultValue={10}
                    className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600 w-24" />
                </div>
                <button type="submit" className="bg-stone-800 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-900">
                  Nastavi popust
                </button>
              </form>
              <form action={setBulkDiscount} className="flex flex-wrap gap-3 items-end border-t border-stone-100 pt-4">
                <input type="hidden" name="categoryId" value="all" />
                <input type="hidden" name="discountPercent" value="0" />
                <div>
                  <p className="text-xs text-stone-500 mb-2">Odstrani vse popuste (povrne originalne cene)</p>
                  <button type="submit" className="border border-red-300 text-red-600 px-4 py-2 text-xs tracking-widest uppercase hover:bg-red-50">
                    Odstrani vse popuste
                  </button>
                </div>
              </form>
            </section>

            {/* Per-product discounts */}
            <section className="rounded border border-stone-200 bg-white p-6">
              <h2 className="text-lg font-medium text-stone-800 mb-5">Popusti po izdelkih</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs tracking-widest uppercase text-stone-400">
                      <th className="py-2 pr-4 font-medium">Izdelek</th>
                      <th className="py-2 pr-4 font-medium">Orig. cena</th>
                      <th className="py-2 pr-4 font-medium">Trenutna cena</th>
                      <th className="py-2 pr-4 font-medium">Popust</th>
                      <th className="py-2 font-medium">Nastavi popust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {products.map((p) => {
                      const origCents = p.compareAtPriceCents ?? p.priceCents;
                      const currentDiscount = p.compareAtPriceCents
                        ? Math.round((1 - p.priceCents / p.compareAtPriceCents) * 100)
                        : 0;
                      return (
                        <tr key={p.id} className="hover:bg-stone-50/50">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              {p.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded border border-stone-100 object-cover shrink-0" />
                              )}
                              <span className="text-stone-800 font-medium">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-stone-500">{formatPrice(origCents)}</td>
                          <td className="py-3 pr-4">
                            <span className={p.compareAtPriceCents ? "text-red-600 font-medium" : "text-stone-700"}>
                              {formatPrice(p.priceCents)}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {currentDiscount > 0 ? (
                              <span className="inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded">
                                -{currentDiscount}%
                              </span>
                            ) : (
                              <span className="text-stone-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <form action={setProductDiscount} className="flex items-center gap-2">
                                <input type="hidden" name="id" value={p.id} />
                                <input type="number" name="discountPercent" min={0} max={80}
                                  defaultValue={currentDiscount}
                                  className="border border-stone-300 px-2 py-1 text-xs w-16 outline-none focus:border-stone-600" />
                                <span className="text-xs text-stone-400">%</span>
                                <button type="submit" className="bg-stone-800 text-white px-3 py-1 text-xs tracking-widest uppercase hover:bg-stone-900">
                                  OK
                                </button>
                              </form>
                              {currentDiscount > 0 && (
                                <form action={setProductDiscount}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="discountPercent" value="0" />
                                  <button type="submit" className="text-xs text-red-500 hover:text-red-700 tracking-widest uppercase">
                                    Odstrani
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Analytics section */}
        {section === "analitika" && (
          <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded border border-stone-200 bg-white p-5">
                <p className="text-xs tracking-widest uppercase text-stone-400">Promet (30 dni)</p>
                <p className="mt-2 text-2xl font-light text-stone-900">{formatPrice(analyticsRevTotal)}</p>
              </div>
              <div className="rounded border border-stone-200 bg-white p-5">
                <p className="text-xs tracking-widest uppercase text-stone-400">Naročila (30 dni)</p>
                <p className="mt-2 text-2xl font-light text-stone-900">{analyticsOrdersTotal}</p>
              </div>
              <div className="rounded border border-stone-200 bg-white p-5 col-span-2 md:col-span-1">
                <p className="text-xs tracking-widest uppercase text-stone-400">Povprečno naročilo</p>
                <p className="mt-2 text-2xl font-light text-stone-900">{formatPrice(analyticsAvgOrder)}</p>
              </div>
            </div>

            {/* Daily revenue chart */}
            <div className="rounded border border-stone-200 bg-white p-6">
              <h2 className="mb-1 text-xs tracking-widest uppercase text-stone-400">Dnevni promet — zadnjih 30 dni</h2>
              <p className="mb-4 text-xs text-stone-400">Brez preklicanih naročil</p>
              <BarChart
                data={analyticsDaily.map((d) => ({ label: d.label, value: d.revCents }))}
                labelEvery={5}
              />
            </div>

            {/* Daily order count chart */}
            <div className="rounded border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-xs tracking-widest uppercase text-stone-400">Dnevno število naročil — zadnjih 30 dni</h2>
              <BarChart
                data={analyticsDaily.map((d) => ({ label: d.label, value: d.count }))}
                labelEvery={5}
                barColor="#44403c"
              />
            </div>

            {/* Status distribution */}
            <div className="rounded border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-xs tracking-widest uppercase text-stone-400">Naročila po statusu (zadnjih 100)</h2>
              <div className="space-y-3">
                {(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"] as const).map((status) => {
                  const count = analyticsStatusCounts[status] ?? 0;
                  const total = Object.values(analyticsStatusCounts).reduce(
                    (sum: number, value: number) => sum + value,
                    0
                  );
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const labels: Record<string, string> = {
                    PENDING: "Čakanje", CONFIRMED: "Potrjeno", PREPARING: "V pripravi",
                    SHIPPED: "V dostavi", DELIVERED: "Dostavljeno", CANCELLED: "Preklicano",
                  };
                  const colors: Record<string, string> = {
                    PENDING: "bg-amber-400", CONFIRMED: "bg-blue-400", PREPARING: "bg-purple-400",
                    SHIPPED: "bg-cyan-400", DELIVERED: "bg-green-500", CANCELLED: "bg-red-400",
                  };
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-stone-500">{labels[status]}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-xs text-stone-500">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top products */}
            {analyticsTopProducts.length > 0 && (
              <div className="rounded border border-stone-200 bg-white p-6">
                <h2 className="mb-4 text-xs tracking-widest uppercase text-stone-400">Najboljši izdelki — zadnjih 30 dni</h2>
                <div className="space-y-3">
                  {analyticsTopProducts.map(([name, qty], i) => {
                    const maxQty = analyticsTopProducts[0]?.[1] ?? 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 shrink-0 text-xs font-medium text-stone-400">{i + 1}.</span>
                        <span className="w-40 shrink-0 truncate text-xs text-stone-700">{name}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-stone-800" style={{ width: `${Math.round((qty / maxQty) * 100)}%` }} />
                        </div>
                        <span className="w-12 text-right text-xs text-stone-500">{qty} kos</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
