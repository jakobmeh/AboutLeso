import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function SiteNavbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-light tracking-[0.4em] text-stone-900 uppercase">
          Leso
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/products" className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
            Katalog
          </Link>
          {user && (
            <>
              <Link href="/orders" className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                Naročila
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-5">
          {user ? (
            <>
              <span className="hidden text-xs text-stone-500 md:block">{user.name ?? user.email}</span>
              <Link href="/cart" className="relative text-xs tracking-widest uppercase text-stone-600 hover:text-stone-900 transition-colors">
                Košarica
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
              <Link href="/register" className="bg-stone-900 px-4 py-2 text-xs tracking-widest uppercase text-white hover:bg-stone-700 transition-colors">
                Registracija
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
