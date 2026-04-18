import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50">
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
