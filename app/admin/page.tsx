import { Role } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/authz";

export default async function AdminPage() {
  const session = await requireRole([Role.ADMIN]);

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-12">
      <main className="mx-auto max-w-4xl rounded border border-stone-200 bg-white p-8">
        <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-800">
          Admin Panel
        </h1>
        <p className="mt-4 text-sm text-stone-600">
          Prijavljen kot: {session.user.name ?? session.user.email}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Role: <span className="font-medium text-stone-800">{session.user.role}</span>
        </p>
        <p className="mt-8 text-stone-500">
          To je začetna admin stran. V naslednjem koraku tukaj dodava CRUD za izdelke in šifrante.
        </p>
      </main>
    </div>
  );
}
