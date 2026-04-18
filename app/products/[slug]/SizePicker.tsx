"use client";

import { useState } from "react";
import { addToCart } from "@/app/actions/cart";
import { StockAlertForm } from "@/app/components/StockAlertForm";

type Variant = { id: string; size: string; stock: number; isActive: boolean };

export function SizePicker({
  variants,
  isLoggedIn,
  userEmail,
}: {
  variants: Variant[];
  isLoggedIn: boolean;
  userEmail?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const activeVariants = variants.filter((v: Variant) => v.isActive);
  const selectedVariant = activeVariants.find((v: Variant) => v.id === selected);

  async function handleSubmit(formData: FormData) {
    if (!selected) return;
    await addToCart(formData);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (activeVariants.length === 0) {
    return (
      <div className="mt-6 border border-stone-100 py-3 text-center text-xs tracking-widest uppercase text-stone-400">
        Ni na zalogi
      </div>
    );
  }

  const outOfStockVariants = activeVariants.filter((v) => v.stock === 0);
  const showAlertForSelected = selectedVariant && selectedVariant.stock === 0;

  return (
    <div className="mt-6 space-y-5">
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">
          Velikost{selected && selectedVariant ? ` — ${selectedVariant.size}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {activeVariants.map((v: Variant) => {
            const outOfStock = v.stock === 0;
            const isSelected = selected === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v.id)}
                className={`
                  relative min-w-[44px] px-3 py-2 text-sm border transition-all duration-200
                  ${outOfStock
                    ? isSelected
                      ? "border-stone-400 text-stone-400"
                      : "border-stone-100 text-stone-300"
                    : isSelected
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 text-stone-700 hover:border-stone-900"
                  }
                `}
              >
                {v.size}
                {outOfStock && !isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="absolute w-full h-px bg-stone-200 rotate-[-30deg]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedVariant && selectedVariant.stock <= 3 && selectedVariant.stock > 0 && (
        <p className="text-xs text-amber-600">
          Samo {selectedVariant.stock} {selectedVariant.stock === 1 ? "kos" : "kosa"} na zalogi
        </p>
      )}

      {/* Stock alert for out-of-stock selected size */}
      {showAlertForSelected && (
        <div className="border border-stone-100 p-3 bg-stone-50/50">
          <p className="text-xs text-stone-500 mb-2">Ta velikost trenutno ni na zalogi.</p>
          <StockAlertForm variantId={selectedVariant.id} size={selectedVariant.size} userEmail={userEmail} />
        </div>
      )}

      {isLoggedIn ? (
        <form action={handleSubmit}>
          <input type="hidden" name="variantId" value={selected ?? ""} />
          <input type="hidden" name="quantity" value="1" />
          <button
            type="submit"
            disabled={!selected || !selectedVariant || selectedVariant.stock === 0}
            className="w-full py-4 text-xs tracking-[0.2em] uppercase transition-all duration-200
              bg-stone-900 text-white hover:bg-stone-700
              disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
          >
            {added ? "Dodano ✓" : !selected ? "Izberi velikost" : selectedVariant?.stock === 0 ? "Ni na zalogi" : "Dodaj v košarico"}
          </button>
        </form>
      ) : (
        <a href="/login"
          className="block w-full py-4 text-center text-xs tracking-[0.2em] uppercase bg-stone-900 text-white hover:bg-stone-700 transition-colors">
          Prijavi se za nakup
        </a>
      )}
    </div>
  );
}
