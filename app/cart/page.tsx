import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { removeCartItem, updateCartItemQuantity } from "@/app/actions/cart";
import { checkoutFromCart } from "@/app/actions/checkout";
import { prisma } from "@/lib/prisma";

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} EUR`;
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
            select: {
              id: true,
              name: true,
              priceCents: true,
              stock: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const items = cart?.items ?? [];
  const subtotalCents = items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-12">
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="rounded border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-800">Cart</h1>
          <p className="mt-3 text-sm text-stone-600">Products are stored in DB per user.</p>
        </section>

        <section className="rounded border border-stone-200 bg-white p-6">
          {items.length === 0 ? (
            <div className="space-y-3">
              <p className="text-stone-500">Your cart is empty.</p>
              <Link
                href="/products"
                className="inline-block border border-stone-300 px-4 py-2 text-xs tracking-widest uppercase text-stone-600 hover:text-stone-800"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500">
                      <th className="py-2 pr-4 font-medium">Product</th>
                      <th className="py-2 pr-4 font-medium">Price</th>
                      <th className="py-2 pr-4 font-medium">Stock</th>
                      <th className="py-2 pr-4 font-medium">Quantity</th>
                      <th className="py-2 pr-4 font-medium">Line total</th>
                      <th className="py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-stone-100">
                        <td className="py-3 pr-4 text-stone-800">
                          {item.product.name}
                          {!item.product.isActive && (
                            <span className="ml-2 text-xs uppercase tracking-widest text-red-700">
                              inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-stone-700">{formatPrice(item.product.priceCents)}</td>
                        <td className="py-3 pr-4 text-stone-700">{item.product.stock}</td>
                        <td className="py-3 pr-4">
                          <form action={updateCartItemQuantity} className="flex items-center gap-2">
                            <input type="hidden" name="itemId" value={item.id} />
                            <input
                              type="number"
                              name="quantity"
                              min={0}
                              max={Math.max(item.product.stock, 0)}
                              defaultValue={item.quantity}
                              className="w-20 border border-stone-300 px-2 py-1 text-sm text-stone-800 outline-none focus:border-stone-600"
                            />
                            <button
                              type="submit"
                              className="text-xs tracking-widest uppercase text-stone-600 hover:text-stone-800"
                            >
                              Update
                            </button>
                          </form>
                        </td>
                        <td className="py-3 pr-4 text-stone-700">
                          {formatPrice(item.product.priceCents * item.quantity)}
                        </td>
                        <td className="py-3 text-right">
                          <form action={removeCartItem}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <button
                              type="submit"
                              className="text-xs tracking-widest uppercase text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 border-t border-stone-200 pt-4">
                <p className="text-sm text-stone-700">
                  Subtotal: <span className="font-medium text-stone-900">{formatPrice(subtotalCents)}</span>
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <form action={checkoutFromCart}>
                    <button
                      type="submit"
                      className="bg-stone-800 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-900"
                    >
                      Checkout
                    </button>
                  </form>
                  <Link
                    href="/orders"
                    className="border border-stone-300 px-4 py-2 text-xs tracking-widest uppercase text-stone-600 hover:text-stone-800"
                  >
                    My orders
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
