import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavAudienceTabs } from "./NavAudienceTabs";
import { NavGroupTabs } from "./NavGroupTabs";

export async function SiteNavbar() {
  const [session, audiences] = await Promise.all([
    auth(),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
  ]);
  const user = session?.user;

  type TaxItem = (typeof audiences)[0];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200/80" style={{ boxShadow: "0 1px 20px -4px rgba(0,0,0,0.08)" }}>
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
            className="absolute left-1/2 -translate-x-1/2 text-xl font-light tracking-[0.6em] text-stone-900 uppercase select-none hover:tracking-[0.8em] transition-all duration-500"
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

      {/* Row 2: category group nav — only shown when audience is selected */}
      <NavGroupTabs />
    </header>
  );
}
