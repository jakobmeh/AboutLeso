import { auth } from "@/auth";
import { Role } from "@/app/generated/prisma/client";

type SessionUser = { id: string; name?: string | null; email?: string | null; role?: string };
type AuthSession = { user: SessionUser };

export async function requireRole(roles: Role[]): Promise<AuthSession> {
  const session = await auth();

  if (!session?.user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  const userRole = (session!.user as { role?: string }).role as Role | undefined;

  if (!userRole || !roles.includes(userRole)) {
    const { redirect } = await import("next/navigation");
    redirect("/");
  }

  return session! as AuthSession;
}
