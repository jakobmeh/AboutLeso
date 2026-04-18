"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CATEGORY_GROUPS } from "@/lib/category-groups";

function Tabs() {
  const sp = useSearchParams();
  const audienceId = sp.get("audienceId") ?? "";
  const group = sp.get("group") ?? "";

  // Hide the group nav on the general homepage (no audience selected)
  if (!audienceId) return null;

  function makeUrl(slug: string) {
    const p = new URLSearchParams();
    p.set("group", slug);
    if (audienceId) p.set("audienceId", audienceId);
    return `/products?${p.toString()}`;
  }

  const homeUrl = audienceId ? `/?audienceId=${audienceId}` : "/";
  const saleUrl = audienceId ? `/products?sale=1&audienceId=${audienceId}` : "/products?sale=1";

  const base = "shrink-0 px-4 py-2.5 text-xs tracking-widest uppercase transition-colors whitespace-nowrap";
  const active = `${base} text-stone-900 border-b-2 border-stone-900 font-medium`;
  const idle = `${base} text-stone-500 hover:text-stone-900`;

  return (
    <div className="border-t border-stone-100">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
    <nav className="flex items-center overflow-x-auto no-scrollbar">
      <Link href={homeUrl} className={!group ? active : idle}>Domov</Link>
      {CATEGORY_GROUPS.map((g) => (
        <Link key={g.slug} href={makeUrl(g.slug)} className={group === g.slug ? active : idle}>
          {g.name}
        </Link>
      ))}
      <Link href={saleUrl} className={`${base} text-red-500 hover:text-red-700 font-medium`}>
        Razprodaja
      </Link>
    </nav>
    </div>
    </div>
  );
}

export function NavGroupTabs() {
  return (
    <Suspense fallback={null}>
      <Tabs />
    </Suspense>
  );
}
