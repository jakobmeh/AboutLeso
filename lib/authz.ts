import { auth } from "@/auth";
import { Role } from "@/app/generated/prisma/client";
import { redirect } from "next/navigation";

export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect("/dashboard");
  }

  return session;
}
