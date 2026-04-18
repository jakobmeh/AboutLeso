import Link from "next/link";
import { stripe } from "@/lib/stripe";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let customerEmail: string | null = null;
  let amountTotal: number | null = null;

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      customerEmail = session.customer_email ?? null;
      amountTotal = session.amount_total;
    } catch {
      // ignore — session may not exist yet
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center fade-up">
        {/* Check icon */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-stone-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-10 w-10">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-light tracking-tight text-stone-900">
          Plačilo uspešno
        </h1>
        <p className="mt-3 text-sm text-stone-500 leading-relaxed">
          Hvala za nakup! Vaše naročilo je potrjeno.
          {customerEmail && (
            <> Potrdilo smo poslali na <strong className="text-stone-700">{customerEmail}</strong>.</>
          )}
        </p>

        {amountTotal !== null && (
          <p className="mt-4 text-2xl font-semibold text-stone-900">
            {new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(amountTotal / 100)}
          </p>
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/orders"
            className="bg-stone-900 px-10 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
          >
            Moja naročila
          </Link>
          <Link
            href="/products"
            className="border border-stone-200 px-10 py-3 text-xs tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors"
          >
            Nadaljuj nakupovanje
          </Link>
        </div>
      </div>
    </div>
  );
}
