"use client";

import { useState, useTransition } from "react";
import { toggleWishlist } from "@/app/actions/wishlist";

export function WishlistButton({
  productId,
  initialSaved,
  className = "",
}: {
  productId: string;
  initialSaved: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSaved((v) => !v);
    startTransition(() => toggleWishlist(productId));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={saved ? "Odstrani iz priljubljenih" : "Dodaj med priljubljene"}
      className={`flex items-center justify-center transition-all ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill={saved ? "#1c1917" : "none"} stroke="#1c1917" strokeWidth="1.8">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
