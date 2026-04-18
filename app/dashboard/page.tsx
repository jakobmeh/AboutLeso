import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-light tracking-[0.3em] text-stone-800 uppercase">
          Leso
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-600">
            {session.user.name ?? session.user.email}
          </span>
          <Link
            href="/products"
            className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-800 transition-colors"
          >
            Products
          </Link>
          {session.user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-800 transition-colors"
            >
              Admin
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-800 transition-colors"
            >
              Odjava
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-500 text-sm tracking-wide uppercase mb-2">
          Dobrodošli
        </p>
        <h2 className="text-4xl font-light text-stone-800 mb-4">
          {session.user.name ?? "Uporabnik"}
        </h2>
        <p className="text-stone-500">Uspešno ste se prijavili v Leso.</p>
      </main>
    </div>
  );
}
