import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavAudienceTabs } from "./NavAudienceTabs";

export async function SiteNavbar() {
  const [session, audiences, categories] = await Promise.all([
    auth(),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const user = session?.user;

  type TaxItem = (typeof audiences)[0];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
      {/* Row 1: audiences | logo | icons */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Audiences */}
          <nav className="flex items-center gap-1 shrink-0">
            <NavAudienceTabs audiences={audiences} />
          </nav>

          {/* Logo */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-xl font-light tracking-[0.5em] text-stone-900 uppercase select-none"
          >
            Leso
          </Link>

          {/* Icons */}
          <div className="flex items-center gap-4 shrink-0 ml-auto">
            {user ? (
              <>
                {(user.role === "CREATOR") && (
                  <Link href="/creator" className="hidden sm:block text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                    Kreator
                  </Link>
                )}
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="hidden sm:block text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                    Admin
                  </Link>
                )}
                <Link href="/cart" className="text-xs tracking-widest uppercase text-stone-600 hover:text-stone-900 transition-colors">
                  Košarica
                </Link>
                <Link href="/orders" className="hidden sm:block text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                  Naročila
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button type="submit" className="text-xs tracking-widest uppercase text-stone-400 hover:text-stone-700 transition-colors">
                    Odjava
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                  Prijava
                </Link>
                <Link href="/register" className="bg-stone-900 px-4 py-1.5 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors">
                  Registracija
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: category nav */}
      {categories.length > 0 && (
        <div className="border-t border-stone-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <nav className="flex items-center gap-0 overflow-x-auto no-scrollbar">
              <Link
                href="/products"
                className="shrink-0 px-4 py-2.5 text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors whitespace-nowrap"
              >
                Vse
              </Link>
              {categories.map((cat: TaxItem) => (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  className="shrink-0 px-4 py-2.5 text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                href="/products?sale=1"
                className="shrink-0 px-4 py-2.5 text-xs tracking-widest uppercase text-red-500 hover:text-red-700 transition-colors whitespace-nowrap font-medium"
              >
                Razprodaja
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
