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
import { requireRole } from "@/lib/authz";
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
  stock: number;
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
            placeholder="Price (EUR)"
            className="border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-600"
          />
          <input
            type="number"
            name="stock"
            min="0"
            step="1"
            required
            defaultValue={0}
            placeholder="Stock"
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
              <th className="py-2 pr-4 font-medium">Stock</th>
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
                    <td className="py-3 pr-4 text-stone-700">{item.stock}</td>
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
                      <form action={updateProduct} className="grid grid-cols-1 gap-2 md:grid-cols-6">
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
                          className="border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
                        />
                        <input
                          type="number"
                          name="stock"
                          min="0"
                          step="1"
                          defaultValue={item.stock}
                          required
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
                          className="md:col-span-5 border border-stone-300 px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-600"
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
  const errorMessage = one(resolved.error).trim();
  const [categories, seasons, audiences, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.season.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        season: { select: { name: true } },
        audience: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-12">
      <main className="mx-auto max-w-6xl space-y-6">
        <section className="rounded border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-800">
            Admin Panel
          </h1>
          {errorMessage && (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          <p className="mt-4 text-sm text-stone-600">
            Signed in as: {session.user.name ?? session.user.email}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Role: <span className="font-medium text-stone-800">{session.user.role}</span>
          </p>
          <p className="mt-5 text-stone-500">
            Step 3: base product CRUD connected to category, season, and audience.
          </p>
        </section>

        <ProductSection
          products={products}
          categories={categories}
          seasons={seasons}
          audiences={audiences}
        />

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
      </main>
    </div>
  );
}
