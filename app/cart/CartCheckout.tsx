"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FREE_SHIPPING_THRESHOLD_CENTS, STANDARD_SHIPPING_CENTS } from "@/lib/pricing";

type Address = {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

type CodeStatus = "idle" | "checking" | "valid" | "invalid";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(
    cents / 100
  );
}

export function CartCheckout({
  subtotalCents,
  addresses,
  selectedAddressId: initialSelectedAddressId,
  checkoutAction,
  addressErrorMessage,
  addressSuccess,
}: {
  subtotalCents: number;
  addresses: Address[];
  selectedAddressId: string;
  checkoutAction: (fd: FormData) => Promise<void>;
  addressErrorMessage: string;
  addressSuccess: boolean;
}) {
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const [discountPercent, setDiscountPercent] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shippingCents = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
  const shippingFree = shippingCents === 0;
  const discountCents = codeStatus === "valid" ? Math.floor((subtotalCents * discountPercent) / 100) : 0;
  const totalCents = subtotalCents - discountCents + shippingCents;

  const validateCode = useCallback(async (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) { setCodeStatus("idle"); setDiscountPercent(0); return; }
    setCodeStatus("checking");
    try {
      const res = await fetch(`/api/validate-creator-code?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.valid) {
        setCodeStatus("valid");
        setDiscountPercent(data.discountPercent);
      } else {
        setCodeStatus("invalid");
        setDiscountPercent(0);
      }
    } catch {
      setCodeStatus("idle");
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => validateCode(code), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code, validateCode]);

  return (
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
        {discountCents > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Popust ({discountPercent}%)</span>
            <span>−{formatPrice(discountCents)}</span>
          </div>
        )}
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

      <form action={checkoutAction} className="mt-6 space-y-3">
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
                      defaultChecked={initialSelectedAddressId === address.id}
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
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Npr. JAKOB10"
            className={`w-full border px-3 py-2 text-sm text-stone-800 outline-none uppercase placeholder:normal-case placeholder:text-stone-400 transition-colors ${
              codeStatus === "valid"
                ? "border-green-500 focus:border-green-600"
                : codeStatus === "invalid"
                ? "border-red-400 focus:border-red-500"
                : "border-stone-300 focus:border-stone-700"
            }`}
          />
          {codeStatus === "checking" && (
            <p className="mt-1 text-xs text-stone-400">Preverjam kodo…</p>
          )}
          {codeStatus === "valid" && (
            <p className="mt-1 text-xs text-green-700">
              Veljavna koda — {discountPercent}% popust je bil odstevan.
            </p>
          )}
          {codeStatus === "invalid" && code.trim() && (
            <p className="mt-1 text-xs text-red-600">Koda ni veljavna.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={addresses.length === 0}
          className="w-full bg-stone-900 py-3 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          Zakljuci narocilo
        </button>
      </form>
    </div>
  );
}
