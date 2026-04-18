import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [orderCount, cartItemCount] = await Promise.all([
    session.user.id
      ? prisma.order.count({ where: { userId: session.user.id } })
      : Promise.resolve(0),
    session.user.id
      ? prisma.cartItem.count({
          where: { cart: { userId: session.user.id } },
        })
      : Promise.resolve(0),
  ]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero greeting */}
      <div className="bg-stone-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs tracking-[0.4em] uppercase text-stone-400">Dobrodošli nazaj</p>
          <h1 className="mt-3 text-4xl font-light md:text-5xl">
            {session.user.name ?? session.user.email}
          </h1>
          <p className="mt-3 text-sm text-stone-400">
            {session.user.email}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-px bg-stone-200 md:grid-cols-3">
          <div className="bg-white p-6">
            <p className="text-xs tracking-widest uppercase text-stone-400">Naročila</p>
            <p className="mt-2 text-4xl font-light text-stone-900">{orderCount}</p>
          </div>
          <div className="bg-white p-6">
            <p className="text-xs tracking-widest uppercase text-stone-400">V košarici</p>
            <p className="mt-2 text-4xl font-light text-stone-900">{cartItemCount}</p>
          </div>
          <div className="bg-white p-6 col-span-2 md:col-span-1">
            <p className="text-xs tracking-widest uppercase text-stone-400">Status računa</p>
            <p className="mt-2 text-sm font-medium text-green-600 tracking-wide">Aktiven</p>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-xs tracking-widest uppercase text-stone-400 mb-4">Hitri dostopi</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Link
              href="/products"
              className="group border border-stone-200 p-5 hover:border-stone-900 transition-colors"
            >
              <p className="text-sm font-medium text-stone-900">Katalog</p>
              <p className="mt-1 text-xs text-stone-400 group-hover:text-stone-600 transition-colors">Oglejte si vse izdelke</p>
            </Link>
            <Link
              href="/cart"
              className="group border border-stone-200 p-5 hover:border-stone-900 transition-colors"
            >
              <p className="text-sm font-medium text-stone-900">Košarica</p>
              <p className="mt-1 text-xs text-stone-400 group-hover:text-stone-600 transition-colors">
                {cartItemCount > 0 ? `${cartItemCount} artiklov v košarici` : "Košarica je prazna"}
              </p>
            </Link>
            <Link
              href="/orders"
              className="group border border-stone-200 p-5 hover:border-stone-900 transition-colors"
            >
              <p className="text-sm font-medium text-stone-900">Naročila</p>
              <p className="mt-1 text-xs text-stone-400 group-hover:text-stone-600 transition-colors">
                {orderCount > 0 ? `${orderCount} preteklih naročil` : "Še ni naročil"}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
