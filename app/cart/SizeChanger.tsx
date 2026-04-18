"use client";

import { useState } from "react";
import { changeCartItemVariant } from "@/app/actions/cart";

type Variant = { id: string; size: string; stock: number };

export function SizeChanger({
  itemId,
  currentVariantId,
  variants,
}: {
  itemId: string;
  currentVariantId: string;
  variants: Variant[];
}) {
  const [open, setOpen] = useState(false);
  const current = variants.find((v: Variant) => v.id === currentVariantId);

  if (variants.length <= 1) {
    return <span className="text-xs uppercase tracking-widest text-stone-500">{current?.size ?? "UNI"}</span>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs uppercase tracking-widest text-stone-600 hover:text-stone-900 underline underline-offset-2 transition-colors"
      >
        {current?.size ?? "—"} ▾
      </button>

      {open && (
        <div className="absolute left-0 top-6 z-20 bg-white border border-stone-200 shadow-lg p-2 flex flex-wrap gap-1.5 min-w-[160px]">
          {variants.map((v: Variant) => {
            const isCurrent = v.id === currentVariantId;
            const outOfStock = v.stock === 0;
            return (
              <form
                key={v.id}
                action={async (fd) => {
                  await changeCartItemVariant(fd);
                  setOpen(false);
                }}
              >
                <input type="hidden" name="itemId" value={itemId} />
                <input type="hidden" name="newVariantId" value={v.id} />
                <button
                  type="submit"
                  disabled={isCurrent || outOfStock}
                  className={`
                    px-2.5 py-1 text-xs border transition-colors
                    ${isCurrent
                      ? "border-stone-900 bg-stone-900 text-white cursor-default"
                      : outOfStock
                        ? "border-stone-100 text-stone-300 cursor-not-allowed line-through"
                        : "border-stone-200 text-stone-700 hover:border-stone-900"
                    }
                  `}
                >
                  {v.size}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
