import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { removeCartItem, updateCartItemQuantity } from "@/app/actions/cart";
import { checkoutFromCart } from "@/app/actions/checkout";
import { prisma } from "@/lib/prisma";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default async function CartPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, priceCents: true, stock: true, isActive: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const items = cart?.items ?? [];
  const subtotalCents = (cart?.items ?? []).reduce((sum: number, item: NonNullable<typeof cart>["items"][0]) => sum + item.product.priceCents * item.quantity, 0);
  const shippingFree = subtotalCents >= 8000;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h1 className="text-3xl font-light tracking-wide text-stone-900">Košarica</h1>
          <p className="mt-1 text-sm text-stone-500">
            {items.length === 0 ? "Prazna košarica" : `${items.length} ${items.length === 1 ? "artikel" : "artiklov"}`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 text-stone-200 text-7xl">○</div>
            <h2 className="text-xl font-light text-stone-700">Vaša košarica je prazna</h2>
            <p className="mt-2 text-sm text-stone-400">Dodajte izdelke iz kataloga in začnite nakupovati.</p>
            <Link
              href="/products"
              className="mt-8 bg-stone-900 px-8 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
            >
              Pojdi v katalog
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            {/* Items */}
            <div className="flex-1">
              <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-stone-200 pb-3 text-xs tracking-widest uppercase text-stone-400 md:grid">
                <span>Izdelek</span>
                <span className="text-right">Cena</span>
                <span className="text-right">Zalogo</span>
                <span className="text-right">Količina</span>
                <span className="text-right">Skupaj</span>
              </div>

              <div className="divide-y divide-stone-100">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 py-6 md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center">
                    <div>
                      <p className="font-medium text-stone-900 text-sm">{item.product.name}</p>
                      {!item.product.isActive && (
                        <span className="mt-1 inline-block text-xs tracking-widest uppercase text-red-400">Ni več aktiven</span>
                      )}
                    </div>
                    <p className="text-sm text-stone-600 md:text-right">{formatPrice(item.product.priceCents)}</p>
                    <p className="text-xs text-stone-400 md:text-right">{item.product.stock} kos</p>
                    <form action={updateCartItemQuantity} className="flex items-center gap-2 md:justify-end">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input
                        type="number"
                        name="quantity"
                        min={0}
                        max={Math.max(item.product.stock, 0)}
                        defaultValue={item.quantity}
                        className="w-16 border border-stone-300 px-2 py-1 text-center text-sm text-stone-800 outline-none focus:border-stone-700"
                      />
                      <button type="submit" className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-800 transition-colors">
                        ↵
                      </button>
                    </form>
                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                      <p className="text-sm font-medium text-stone-800">{formatPrice(item.product.priceCents * item.quantity)}</p>
                      <form action={removeCartItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button type="submit" className="text-xs tracking-widest uppercase text-stone-300 hover:text-red-500 transition-colors">
                          Odstrani
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100">
                <Link href="/products" className="text-xs tracking-widest uppercase text-stone-400 underline underline-offset-4 hover:text-stone-700 transition-colors">
                  ← Nadaljuj nakupovanje
                </Link>
              </div>
            </div>

            {/* Order summary */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="border border-stone-200 p-6">
                <h2 className="text-xs tracking-widest uppercase text-stone-700 mb-5">Povzetek naročila</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Vmesni seštevek</span>
                    <span>{formatPrice(subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Dostava</span>
                    <span className={shippingFree ? "text-green-600" : "text-stone-600"}>
                      {shippingFree ? "Brezplačno" : formatPrice(399)}
                    </span>
                  </div>
                  {!shippingFree && (
                    <p className="text-xs text-stone-400">
                      Do brezplačne dostave manjka {formatPrice(8000 - subtotalCents)}.
                    </p>
                  )}
                  <div className="border-t border-stone-200 pt-3 flex justify-between font-medium text-stone-900">
                    <span>Skupaj</span>
                    <span>{formatPrice(subtotalCents + (shippingFree ? 0 : 399))}</span>
                  </div>
                </div>

                <form action={checkoutFromCart} className="mt-6">
                  <button
                    type="submit"
                    className="w-full bg-stone-900 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
                  >
                    Zaključi naročilo
                  </button>
                </form>

                <Link
                  href="/orders"
                  className="mt-3 block w-full border border-stone-300 py-3 text-center text-xs tracking-widest uppercase text-stone-600 hover:border-stone-700 hover:text-stone-900 transition-colors"
                >
                  Moja naročila
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
