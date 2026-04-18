import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { removeCartItem, updateCartItemQuantity } from "@/app/actions/cart";
import { checkoutFromCart } from "@/app/actions/checkout";
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/app/actions/addresses";
import { prisma } from "@/lib/prisma";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  getShippingCents,
} from "@/lib/pricing";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(
    cents / 100
  );
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const addressError = one(params.addressError);
  const addressSuccess = one(params.addressSuccess) === "1";
  const selectedAddressIdFromQuery = one(params.addressId);

  const [cart, addresses] = await Promise.all([
    prisma.cart.findUnique({
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
    }),
    prisma.userAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  type CartItem = NonNullable<typeof cart>["items"][0];
  type Address = (typeof addresses)[0];

  const items: CartItem[] = cart?.items ?? [];
  const subtotalCents = items.reduce(
    (sum: number, item: CartItem) => sum + item.product.priceCents * item.quantity,
    0
  );
  const shippingCents = getShippingCents(subtotalCents);
  const shippingFree = shippingCents === 0;
  const totalCents = subtotalCents + shippingCents;

  const hasAddressFromQuery = addresses.some((a: Address) => a.id === selectedAddressIdFromQuery);
  const selectedAddressId = hasAddressFromQuery
    ? selectedAddressIdFromQuery
    : addresses[0]?.id ?? "";

  const addressErrorMessage =
    addressError === "required"
      ? "Za oddajo narocila najprej dodaj ali izberi naslov dostave."
      : addressError === "invalid"
        ? "Podatki naslova niso veljavni. Preveri vnos in poskusi znova."
        : addressError === "not_found"
          ? "Izbran naslov ne obstaja vec."
          : "";

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h1 className="text-3xl font-light tracking-wide text-stone-900">Kosarica</h1>
          <p className="mt-1 text-sm text-stone-500">
            {items.length === 0
              ? "Prazna kosarica"
              : `${items.length} ${items.length === 1 ? "artikel" : "artiklov"}`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 text-7xl text-stone-200">o</div>
            <h2 className="text-xl font-light text-stone-700">Vasa kosarica je prazna</h2>
            <p className="mt-2 text-sm text-stone-400">
              Dodajte izdelke iz kataloga in zacnite nakupovati.
            </p>
            <Link
              href="/products"
              className="mt-8 bg-stone-900 px-8 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
            >
              Pojdi v katalog
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <div className="flex-1">
              <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-stone-200 pb-3 text-xs tracking-widest uppercase text-stone-400 md:grid">
                <span>Izdelek</span>
                <span className="text-right">Cena</span>
                <span className="text-right">Zaloga</span>
                <span className="text-right">Kolicina</span>
                <span className="text-right">Skupaj</span>
              </div>

              <div className="divide-y divide-stone-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 py-6 md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-900">{item.product.name}</p>
                      {!item.product.isActive && (
                        <span className="mt-1 inline-block text-xs tracking-widest uppercase text-red-500">
                          Ni vec aktiven
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-600 md:text-right">
                      {formatPrice(item.product.priceCents)}
                    </p>
                    <p className="text-xs text-stone-400 md:text-right">
                      {item.product.stock} kos
                    </p>
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
                      <button
                        type="submit"
                        className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-800 transition-colors"
                      >
                        Posodobi
                      </button>
                    </form>
                    <div className="flex items-center justify-between gap-2 md:flex-col md:items-end">
                      <p className="text-sm font-medium text-stone-800">
                        {formatPrice(item.product.priceCents * item.quantity)}
                      </p>
                      <form action={removeCartItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          className="text-xs tracking-widest uppercase text-stone-300 hover:text-red-500 transition-colors"
                        >
                          Odstrani
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-stone-100 pt-4">
                <Link
                  href="/products"
                  className="text-xs tracking-widest uppercase text-stone-400 underline underline-offset-4 hover:text-stone-700 transition-colors"
                >
                  Nazaj v katalog
                </Link>
              </div>
            </div>

            <div className="w-full shrink-0 lg:w-[420px]">
              <div className="border border-stone-200 p-6">
                <h2 className="mb-5 text-xs tracking-widest uppercase text-stone-700">
                  Povzetek narocila
                </h2>

                {addressErrorMessage && (
                  <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {addressErrorMessage}
                  </p>
                )}
                {addressSuccess && (
                  <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    Naslov je bil uspesno dodan.
                  </p>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Vmesni znesek</span>
                    <span>{formatPrice(subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Dostava</span>
                    <span className={shippingFree ? "text-green-600" : "text-stone-600"}>
                      {shippingFree ? "Brezplacno" : formatPrice(shippingCents)}
                    </span>
                  </div>
                  {!shippingFree && (
                    <p className="text-xs text-stone-400">
                      Do brezplacne dostave manjka{" "}
                      {formatPrice(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents)}.
                    </p>
                  )}
                  <div className="flex justify-between border-t border-stone-200 pt-3 font-medium text-stone-900">
                    <span>Skupaj</span>
                    <span>{formatPrice(totalCents)}</span>
                  </div>
                </div>

                <form action={checkoutFromCart} className="mt-6 space-y-3">
                  <div>
                    <p className="mb-2 text-xs tracking-widest uppercase text-stone-400">
                      Naslov dostave
                    </p>
                    {addresses.length === 0 ? (
                      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Nimas vpisanega naslova. Dodaj ga spodaj.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {addresses.map((address) => (
                          <label
                            key={address.id}
                            className="block cursor-pointer border border-stone-200 p-3 text-sm hover:border-stone-400"
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="addressId"
                                value={address.id}
                                defaultChecked={selectedAddressId === address.id}
                                className="mt-1 accent-stone-800"
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-stone-800">
                                  {address.label || "Naslov"}
                                  {address.isDefault && (
                                    <span className="ml-2 text-xs uppercase tracking-widest text-green-700">
                                      Privzet
                                    </span>
                                  )}
                                </p>
                                <p className="text-stone-700">{address.fullName}</p>
                                <p className="text-stone-600">{address.line1}</p>
                                {address.line2 && <p className="text-stone-600">{address.line2}</p>}
                                <p className="text-stone-600">
                                  {address.postalCode} {address.city}, {address.country}
                                </p>
                                {address.phone && (
                                  <p className="text-xs text-stone-500">Tel: {address.phone}</p>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs tracking-widest uppercase text-stone-400">
                      Kreator koda (neobvezno)
                    </label>
                    <input
                      type="text"
                      name="creatorCode"
                      placeholder="Npr. JAKOB10"
                      className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-700 uppercase placeholder:normal-case placeholder:text-stone-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addresses.length === 0}
                    className="w-full bg-stone-900 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    Zakljuci narocilo
                  </button>
                </form>

                {addresses.length > 0 && (
                  <div className="mt-6 border-t border-stone-200 pt-4">
                    <p className="mb-2 text-xs tracking-widest uppercase text-stone-400">
                      Upravljanje naslovov
                    </p>
                    <div className="space-y-2">
                      {addresses.map((address) => (
                        <div
                          key={`manage-${address.id}`}
                          className="flex items-center justify-between rounded border border-stone-100 px-3 py-2"
                        >
                          <span className="text-xs text-stone-600">
                            {address.label || `${address.city}, ${address.line1}`}
                          </span>
                          <div className="flex items-center gap-2">
                            {!address.isDefault && (
                              <form action={setDefaultAddress}>
                                <input type="hidden" name="id" value={address.id} />
                                <button
                                  type="submit"
                                  className="text-xs uppercase tracking-widest text-stone-500 hover:text-stone-800"
                                >
                                  Privzet
                                </button>
                              </form>
                            )}
                            <form action={deleteAddress}>
                              <input type="hidden" name="id" value={address.id} />
                              <button
                                type="submit"
                                className="text-xs uppercase tracking-widest text-red-500 hover:text-red-700"
                              >
                                Izbrisi
                              </button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 border-t border-stone-200 pt-4">
                  <p className="mb-2 text-xs tracking-widest uppercase text-stone-400">
                    Dodaj nov naslov
                  </p>
                  <form action={createAddress} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      name="label"
                      placeholder="Oznaka (npr. Dom)"
                      className="border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <input
                      type="text"
                      name="fullName"
                      required
                      placeholder="Ime in priimek"
                      className="border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <input
                      type="text"
                      name="line1"
                      required
                      placeholder="Ulica in hisna stevilka"
                      className="md:col-span-2 border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <input
                      type="text"
                      name="line2"
                      placeholder="Stanovanje, nadstropje (neobvezno)"
                      className="md:col-span-2 border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <input
                      type="text"
                      name="postalCode"
                      required
                      placeholder="Postna stevilka"
                      className="border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <input
                      type="text"
                      name="city"
                      required
                      placeholder="Mesto"
                      className="border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <input
                      type="text"
                      name="country"
                      required
                      defaultValue="Slovenija"
                      placeholder="Drzava"
                      className="border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <input
                      type="text"
                      name="phone"
                      placeholder="Telefon (neobvezno)"
                      className="border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                    />
                    <label className="md:col-span-2 flex items-center gap-2 text-xs text-stone-600">
                      <input type="checkbox" name="setDefault" />
                      Nastavi kot privzet naslov
                    </label>
                    <button
                      type="submit"
                      className="md:col-span-2 border border-stone-800 py-2 text-xs tracking-widest uppercase text-stone-800 hover:bg-stone-900 hover:text-white transition-colors"
                    >
                      Dodaj naslov
                    </button>
                  </form>
                </div>

                <Link
                  href="/orders"
                  className="mt-4 block w-full border border-stone-300 py-3 text-center text-xs tracking-widest uppercase text-stone-600 hover:border-stone-700 hover:text-stone-900 transition-colors"
                >
                  Moja narocila
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
