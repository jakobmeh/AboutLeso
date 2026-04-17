import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} EUR`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("sl-SI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const success = one(params.success) === "1";
  const orderIdFromQuery = one(params.orderId);

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-12">
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="rounded border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-800">My Orders</h1>
          <p className="mt-3 text-sm text-stone-600">Pregled vseh tvojih naročil.</p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/products"
              className="border border-stone-300 px-4 py-2 text-xs tracking-widest uppercase text-stone-600 hover:text-stone-800"
            >
              Products
            </Link>
            <Link
              href="/cart"
              className="border border-stone-300 px-4 py-2 text-xs tracking-widest uppercase text-stone-600 hover:text-stone-800"
            >
              Cart
            </Link>
          </div>
        </section>

        {success && (
          <section className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Naročilo je bilo uspešno ustvarjeno.
            {orderIdFromQuery ? ` ID: ${orderIdFromQuery}` : ""}
          </section>
        )}

        <section className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded border border-stone-200 bg-white p-6 text-stone-500">
              Nimaš še nobenega naročila.
            </div>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="rounded border border-stone-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-500">Order ID</p>
                    <p className="text-sm text-stone-800">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-500">Date</p>
                    <p className="text-sm text-stone-800">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-500">Status</p>
                    <p className="text-sm text-stone-800">{order.status}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-500">Total</p>
                    <p className="text-sm font-medium text-stone-900">{formatPrice(order.totalCents)}</p>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500">
                        <th className="py-2 pr-4 font-medium">Product</th>
                        <th className="py-2 pr-4 font-medium">Unit price</th>
                        <th className="py-2 pr-4 font-medium">Qty</th>
                        <th className="py-2 font-medium">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id} className="border-b border-stone-100">
                          <td className="py-2 pr-4 text-stone-800">{item.productName}</td>
                          <td className="py-2 pr-4 text-stone-700">{formatPrice(item.unitPriceCents)}</td>
                          <td className="py-2 pr-4 text-stone-700">{item.quantity}</td>
                          <td className="py-2 text-stone-700">{formatPrice(item.lineTotalCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
