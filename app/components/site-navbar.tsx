import Link from "next/link";
import { auth, signOut } from "@/auth";

const linkClassName =
  "text-xs tracking-widest uppercase text-stone-500 hover:text-stone-800 transition-colors";

export async function SiteNavbar() {
  const session = await auth();
  const user = session?.user;
  const roleLabel =
    user?.role === "CREATOR" ? "Creator" : user?.role === "ADMIN" ? null : "User";

  return (
    <header className="border-b border-stone-200 bg-white px-6 py-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
        <Link href="/" className="text-xl font-light tracking-[0.3em] text-stone-800 uppercase">
          Leso
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-4">
          <Link href="/products" className={linkClassName}>
            Products
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className={linkClassName}>
                Dashboard
              </Link>
              <Link href="/cart" className={linkClassName}>
                Cart
              </Link>
              <Link href="/orders" className={linkClassName}>
                Orders
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className={linkClassName}>
                  Admin
                </Link>
              )}
              {roleLabel && (
                <span className="text-xs tracking-widest uppercase text-stone-500">{roleLabel}</span>
              )}
              <span className="text-sm text-stone-600">{user.name ?? user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button type="submit" className={linkClassName}>
                  Odjava
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClassName}>
                Login
              </Link>
              <Link href="/register" className={linkClassName}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
