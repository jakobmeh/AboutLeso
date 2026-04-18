"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Audience = { id: string; name: string };

function Tabs({ audiences }: { audiences: Audience[] }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("audienceId") ?? "";

  return (
    <>
      {audiences.map((a) => (
        <Link
          key={a.id}
          href={`/products?audienceId=${a.id}`}
          className={`px-3 py-1 text-xs font-semibold tracking-widest uppercase transition-colors ${
            active === a.id
              ? "text-stone-900 underline underline-offset-4"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          {a.name}
        </Link>
      ))}
    </>
  );
}

export function NavAudienceTabs({ audiences }: { audiences: Audience[] }) {
  return (
    <Suspense
      fallback={audiences.map((a) => (
        <span key={a.id} className="px-3 py-1 text-xs font-semibold tracking-widest uppercase text-stone-500">
          {a.name}
        </span>
      ))}
    >
      <Tabs audiences={audiences} />
    </Suspense>
  );
}
