import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CancelOrderButton } from "./CancelOrderButton";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("sl-SI", { dateStyle: "long", timeStyle: "short" }).format(date);
}

const statusLabel: Record<string, string> = {
  PENDING: "Čakanje na pregled",
  CONFIRMED: "Potrjeno",
  PREPARING: "Pripravljeno za pošiljanje",
  SHIPPED: "V dostavi",
  DELIVERED: "Dostavljeno",
  CANCELLED: "Preklicano",
};

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-purple-50 text-purple-700 border-purple-200",
  SHIPPED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

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

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  type Order = (typeof orders)[0];
  type OrderItem = Order["items"][0];

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-3xl font-light tracking-wide text-stone-900">Moja naročila</h1>
          <p className="mt-1 text-sm text-stone-500">
            {orders.length === 0 ? "Še ni naročil" : `${orders.length} ${orders.length === 1 ? "naročilo" : "naročil"}`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        {success && (
          <div className="border border-green-200 bg-green-50 px-6 py-4 text-sm text-green-800">
            Vaše naročilo je bilo uspešno oddano. Hvala za nakup!
          </div>
        )}

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <h2 className="text-xl font-light text-stone-700">Še nimate naročil</h2>
            <p className="mt-2 text-sm text-stone-400">Ko boste oddali naročilo, bo prikazano tukaj.</p>
            <Link
              href="/products"
              className="mt-8 bg-stone-900 px-8 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
            >
              Pojdi v katalog
            </Link>
          </div>
        ) : (
          orders.map((order: Order) => (
            <article key={order.id} className="border border-stone-200 hover:border-stone-300 transition-colors">

              {/* Compact header row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-stone-100 bg-stone-50/70 px-5 py-3">
                <span className="font-mono text-xs text-stone-400">{order.id.slice(0, 14)}…</span>
                <span className="text-xs text-stone-500">{formatDate(order.createdAt)}</span>
                <span className={`border px-2 py-0.5 text-[10px] tracking-widest uppercase ${statusColor[order.status] ?? "bg-stone-50 text-stone-600 border-stone-200"}`}>
                  {statusLabel[order.status] ?? order.status}
                </span>
                {order.trackingNumber && (
                  <a
                    href={`https://tracking.dpd.de/status/sl_SI/parcel/${order.trackingNumber}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-900 transition-colors"
                  >
                    Sledi DPD →
                  </a>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm font-medium text-stone-900">{formatPrice(order.totalCents)}</span>
                  <a
                    href={`/api/orders/${order.id}/invoice`}
                    className="border border-stone-200 px-2.5 py-1 text-[10px] tracking-widest uppercase text-stone-500 hover:border-stone-600 hover:text-stone-800 transition-colors"
                  >
                    PDF
                  </a>
                  {order.status === "PENDING" && <CancelOrderButton orderId={order.id} />}
                </div>
              </div>

              {/* Items — compact list */}
              <div className="px-5 py-3 space-y-1.5">
                {order.items.map((item: OrderItem) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-stone-800">
                      {item.quantity}× {item.productName}
                      {item.productSize && (
                        <span className="ml-1.5 text-xs text-stone-400">({item.productSize})</span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm text-stone-600">{formatPrice(item.lineTotalCents)}</span>
                  </div>
                ))}
              </div>

              {/* Footer — address + price summary in one slim row */}
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-stone-100 bg-stone-50/50 px-5 py-3">
                <div className="text-xs text-stone-400 leading-relaxed">
                  {order.shippingFullName ? (
                    <span>
                      {[order.shippingFullName, order.shippingLine1, [order.shippingPostalCode, order.shippingCity].filter(Boolean).join(" "), order.shippingCountry]
                        .filter(Boolean).join(" · ")}
                    </span>
                  ) : (
                    <span>Naslov ni shranjen.</span>
                  )}
                </div>
                <div className="flex items-center gap-5 text-xs text-stone-500">
                  {order.discountCents > 0 && (
                    <span>Popust: <span className="text-stone-700">-{formatPrice(order.discountCents)}</span></span>
                  )}
                  <span>Dostava: <span className="text-stone-700">{order.shippingCents === 0 ? "Brezplačno" : formatPrice(order.shippingCents)}</span></span>
                  <span className="font-medium text-stone-900">Skupaj: {formatPrice(order.totalCents)}</span>
                </div>
              </div>

            </article>
          ))
        )}

        <div className="pt-4 flex gap-4">
          <Link href="/products" className="text-xs tracking-widest uppercase text-stone-400 underline underline-offset-4 hover:text-stone-700 transition-colors">
            Katalog
          </Link>
          <Link href="/cart" className="text-xs tracking-widest uppercase text-stone-400 underline underline-offset-4 hover:text-stone-700 transition-colors">
            Košarica
          </Link>
        </div>
      </div>
    </div>
  );
}
