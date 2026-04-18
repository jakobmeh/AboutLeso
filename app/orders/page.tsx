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
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("sl-SI", { dateStyle: "long", timeStyle: "short" }).format(date);
}

const statusLabel: Record<string, string> = {
  PENDING: "V obdelavi",
  CONFIRMED: "Potrjeno",
  CANCELLED: "Preklicano",
};

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-green-50 text-green-700 border-green-200",
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
            <article key={order.id} className="border border-stone-200">
              {/* Order header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 bg-stone-50 px-6 py-4">
                <div className="space-y-1">
                  <p className="text-xs tracking-widest uppercase text-stone-400">Naročilo</p>
                  <p className="font-mono text-xs text-stone-600">{order.id.slice(0, 16)}…</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs tracking-widest uppercase text-stone-400">Datum</p>
                  <p className="text-sm text-stone-700">{formatDate(order.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs tracking-widest uppercase text-stone-400">Status</p>
                  <span className={`inline-block border px-2 py-0.5 text-xs tracking-widest uppercase ${statusColor[order.status] ?? "bg-stone-50 text-stone-600 border-stone-200"}`}>
                    {statusLabel[order.status] ?? order.status}
                  </span>
                  {order.trackingNumber && (
                    <a
                      href={`https://tracking.dpd.de/status/sl_SI/parcel/${order.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 underline underline-offset-2 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      Sledi pošiljki DPD
                    </a>
                  )}
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs tracking-widest uppercase text-stone-400">Skupaj</p>
                  <p className="text-lg font-light text-stone-900">{formatPrice(order.totalCents)}</p>
                  <a
                    href={`/api/orders/${order.id}/invoice`}
                    className="inline-flex border border-stone-300 px-3 py-1 text-[10px] tracking-widest uppercase text-stone-600 hover:border-stone-700 hover:text-stone-900 transition-colors"
                  >
                    Prenesi PDF
                  </a>
                </div>
              </div>

              {/* Order items */}
              <div className="divide-y divide-stone-100 px-6">
                {order.items.map((item: OrderItem) => (
                  <div key={item.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm text-stone-800">{item.productName}</p>
                      {item.productSize && (
                        <p className="text-xs text-stone-500">Velikost: {item.productSize}</p>
                      )}
                      <p className="text-xs text-stone-400">{item.quantity} × {formatPrice(item.unitPriceCents)}</p>
                    </div>
                    <p className="text-sm font-medium text-stone-700">{formatPrice(item.lineTotalCents)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 bg-stone-50 px-6 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <p className="text-xs tracking-widest uppercase text-stone-500">Naslov dostave</p>
                    {order.shippingFullName ? (
                      <div className="text-stone-700">
                        {order.shippingLabel && <p>{order.shippingLabel}</p>}
                        <p>{order.shippingFullName}</p>
                        {order.shippingLine1 && <p>{order.shippingLine1}</p>}
                        {order.shippingLine2 && <p>{order.shippingLine2}</p>}
                        {(order.shippingPostalCode || order.shippingCity) && (
                          <p>
                            {order.shippingPostalCode ?? ""} {order.shippingCity ?? ""}
                          </p>
                        )}
                        {order.shippingCountry && <p>{order.shippingCountry}</p>}
                        {order.shippingPhone && <p className="text-xs text-stone-500">Tel: {order.shippingPhone}</p>}
                      </div>
                    ) : (
                      <p className="text-stone-500">Naslov ni shranjen.</p>
                    )}
                  </div>

                  <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                    <div className="flex items-center justify-between text-stone-600">
                      <span>Vmesni znesek</span>
                      <span>{formatPrice(order.subtotalCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-600">
                      <span>Popust</span>
                      <span>-{formatPrice(order.discountCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-600">
                      <span>Dostava</span>
                      <span>
                        {order.shippingCents === 0 ? "Brezplacno" : formatPrice(order.shippingCents)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2 font-medium text-stone-900">
                      <span>Skupaj</span>
                      <span>{formatPrice(order.totalCents)}</span>
                    </div>
                  </div>
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
