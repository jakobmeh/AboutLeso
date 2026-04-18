"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentlyViewed } from "@/app/hooks/useRecentlyViewed";

type Product = {
  slug: string;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  imageUrl: string | null;
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const slugs = getRecentlyViewed().filter((s) => s !== currentSlug).slice(0, 4);
    if (slugs.length === 0) return;

    fetch(`/api/products/recent?slugs=${slugs.join(",")}`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []));
  }, [currentSlug]);

  if (products.length === 0) return null;

  return (
    <div className="mt-16 border-t border-stone-100 pt-10">
      <h2 className="text-lg font-light tracking-tight text-stone-900 mb-6">Nedavno ogledano</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {products.map((p) => (
          <Link key={p.slug} href={`/products/${p.slug}`} className="group block">
            <div className="aspect-[3/4] bg-stone-100 overflow-hidden mb-2">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-xs tracking-[0.3em] text-stone-300">LESO</span>
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-stone-800 line-clamp-1">{p.name}</p>
            <p className="text-xs text-stone-500 mt-0.5">{formatPrice(p.priceCents)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
