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
  const cartItems = user?.id
    ? await prisma.cartItem.findMany({
        where: { cart: { userId: user.id } },
        select: { quantity: true },
      })
    : [];
  const cartQuantity = cartItems.reduce((sum: number, item) => sum + item.quantity, 0);

  return (
    <header
      className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/95 backdrop-blur-md"
      style={{ boxShadow: "0 1px 20px -4px rgba(0,0,0,0.08)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <nav className="flex shrink-0 items-center gap-1">
            <NavAudienceTabs audiences={audiences} />
          </nav>

          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 select-none text-xl font-light uppercase tracking-[0.6em] text-stone-900 transition-all duration-500 hover:tracking-[0.8em]"
          >
            Leso
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-4">
            {user ? (
              <>
                {user.role === "CREATOR" && (
                  <Link
                    href="/creator"
                    className="hidden text-xs uppercase tracking-widest text-stone-500 transition-colors hover:text-stone-900 sm:block"
                  >
                    Kreator
                  </Link>
                )}
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="hidden text-xs uppercase tracking-widest text-stone-500 transition-colors hover:text-stone-900 sm:block"
                  >
                    Admin
                  </Link>
                )}

                <Link
                  href="/cart"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-stone-600 transition-colors hover:text-stone-900"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="9" cy="20" r="1.4" />
                    <circle cx="18" cy="20" r="1.4" />
                    <path d="M2 3h2.6l2.1 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6l1.2-6.6H7.3" />
                  </svg>
                 
                  <span className="rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] leading-none text-white">
                    {cartQuantity}
                  </span>
                </Link>

                <Link
                  href="/orders"
                  className="hidden text-xs uppercase tracking-widest text-stone-500 transition-colors hover:text-stone-900 sm:block"
                >
                  Narocila
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs uppercase tracking-widest text-stone-400 transition-colors hover:text-stone-700"
                  >
                    Odjava
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs uppercase tracking-widest text-stone-500 transition-colors hover:text-stone-900"
                >
                  Prijava
                </Link>
                <Link
                  href="/register"
                  className="bg-stone-900 px-4 py-1.5 text-xs uppercase tracking-widest text-white transition-colors hover:bg-stone-700"
                >
                  Registracija
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <NavGroupTabs />
    </header>
  );
}
