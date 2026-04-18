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
} from "@/app/actions/admin-products";
import {
  assignCreatorCode,
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
                <td colSpan={8} className="py-4 text-stone-400">
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-b border-stone-100">
                    <td className="py-3 pr-4 text-stone-800">{item.name}</td>
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
                    <td colSpan={8} className="px-3 py-3">
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

  let lookupUser: { id: string; email: string; name: string | null; role: Role; creatorCode: { code: string; discountPercent: number; commissionPercent: number } | null } | null = null;
  if (lookupEmail) {
    lookupUser = await prisma.user.findUnique({
      where: { email: lookupEmail },
      select: { id: true, email: true, name: true, role: true, creatorCode: { select: { code: true, discountPercent: true, commissionPercent: true } } },
    });
  }

  const tabs = [
    { key: "products", label: "Izdelki" },
    { key: "orders", label: "Naročila" },
    { key: "creators", label: "Kreatorji" },
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

                    <form action={assignCreatorCode} className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                      <form action={revokeCreatorCode}>
                        <input type="hidden" name="userId" value={lookupUser.id} />
                        <button
                          type="submit"
                          className="text-xs tracking-widest uppercase text-red-600 hover:text-red-700"
                        >
                          Prekliči kreator status
                        </button>
                      </form>
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
                        <th className="py-2 pr-4 font-medium">Status</th>
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
                          <td className="py-3 pr-4">
                            <span className={`text-xs tracking-widest uppercase font-medium ${row.isActive ? "text-green-700" : "text-red-500"}`}>
                              {row.isActive ? "Aktivna" : "Neaktivna"}
                            </span>
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
          const statusLabel: Record<string, string> = { PENDING: "V obdelavi", CONFIRMED: "Potrjeno", CANCELLED: "Preklicano" };
          const statusColor: Record<string, string> = {
            PENDING: "text-amber-700", CONFIRMED: "text-green-700", CANCELLED: "text-red-600"
          };
          return (
            <section className="rounded border border-stone-200 bg-white p-6 space-y-4">
              <h2 className="text-lg font-medium text-stone-800">Naročila ({allOrders.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs tracking-widest uppercase text-stone-400">
                      <th className="py-2 pr-4 font-medium">ID</th>
                      <th className="py-2 pr-4 font-medium">Stranka</th>
                      <th className="py-2 pr-4 font-medium">Datum</th>
                      <th className="py-2 pr-4 font-medium">Znesek</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Tracking</th>
                      <th className="py-2 font-medium">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {allOrders.map((order: AdminOrder) => (
                      <tr key={order.id}>
                        <td className="py-3 pr-4 font-mono text-xs text-stone-500">{order.id.slice(0, 12)}…</td>
                        <td className="py-3 pr-4">
                          <p className="text-stone-800 text-xs">{order.user.name ?? "—"}</p>
                          <p className="text-stone-400 text-xs">{order.user.email}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs text-stone-600">
                          {new Intl.DateTimeFormat("sl-SI", { dateStyle: "short", timeStyle: "short" }).format(order.createdAt)}
                        </td>
                        <td className="py-3 pr-4 text-xs font-medium text-stone-800">
                          {(order.totalCents / 100).toFixed(2)} €
                        </td>
                        <td className="py-3 pr-4">
                          <form action={setOrderStatus} className="flex items-center gap-1">
                            <input type="hidden" name="orderId" value={order.id} />
                            <select name="status" defaultValue={order.status}
                              className={`border border-stone-200 px-2 py-1 text-xs outline-none bg-white ${statusColor[order.status] ?? ""}`}>
                              <option value="PENDING">V obdelavi</option>
                              <option value="CONFIRMED">Potrjeno</option>
                              <option value="CANCELLED">Preklicano</option>
                            </select>
                            <button type="submit" className="text-xs bg-stone-800 text-white px-2 py-1 hover:bg-stone-900">✓</button>
                          </form>
                        </td>
                        <td className="py-3 pr-4">
                          <form action={setTrackingNumber} className="flex items-center gap-1">
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="text" name="trackingNumber" defaultValue={order.trackingNumber ?? ""}
                              placeholder="DPD številka"
                              className="border border-stone-200 px-2 py-1 text-xs w-32 outline-none focus:border-stone-500" />
                            <button type="submit" className="text-xs bg-stone-800 text-white px-2 py-1 hover:bg-stone-900">✓</button>
                          </form>
                          {order.trackingNumber && (
                            <a href={`https://tracking.dpd.de/status/sl_SI/parcel/${order.trackingNumber}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-0.5 block">
                              Sledenje ↗
                            </a>
                          )}
                        </td>
                        <td className="py-3 text-xs text-stone-500">
                          {order.items.map((i) => `${i.productName} (${i.productSize ?? "?"}) ×${i.quantity}`).join(", ")}
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
      </main>
    </div>
  );
}
