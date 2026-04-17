"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { randomInt } from "crypto";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2, { message: "Ime mora imeti vsaj 2 znaka." }).trim(),
  email: z.string().email({ message: "Vnesite veljaven email." }).trim(),
  password: z
    .string()
    .min(8, { message: "Geslo mora imeti vsaj 8 znakov." })
    .regex(/[a-zA-Z]/, { message: "Geslo mora vsebovati vsaj eno črko." })
    .regex(/[0-9]/, { message: "Geslo mora vsebovati vsaj eno številko." })
    .trim(),
});

const LoginSchema = z.object({
  email: z.string().email({ message: "Vnesite veljaven email." }).trim(),
  password: z.string().min(1, { message: "Vnesite geslo." }).trim(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionState =
  | { errors?: Record<string, string[]>; message?: string; success?: string }
  | undefined;

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(
  state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validated = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["Ta email je že registriran."] } };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  // Generiraj 6-mestno kodo in pošlji email
  const code = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minut

  await prisma.emailVerificationCode.upsert({
    where: { email },
    update: { code, expires },
    create: { email, code, expires },
  });

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("Email send failed:", err);
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(
  state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const code = (formData.get("code") as string)?.trim();

  if (!email || !code) {
    return { message: "Manjkajoči podatki." };
  }

  const record = await prisma.emailVerificationCode.findUnique({
    where: { email },
  });

  if (!record) {
    return { message: "Koda ni veljavna. Zahtevajte novo kodo." };
  }

  if (new Date() > record.expires) {
    await prisma.emailVerificationCode.delete({ where: { email } });
    return { message: "Koda je potekla. Zahtevajte novo kodo." };
  }

  if (record.code !== code) {
    return { message: "Napačna koda. Poskusite znova." };
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.emailVerificationCode.delete({ where: { email } });

  redirect("/login?verified=1");
}

// ─── Resend Verification Code ─────────────────────────────────────────────────

export async function resendVerificationCode(
  state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { message: "Uporabnik ne obstaja." };
  if (user.emailVerified) return { message: "Email je že potrjen." };

  const code = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.emailVerificationCode.upsert({
    where: { email },
    update: { code, expires },
    create: { email, code, expires },
  });

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("Email send failed:", err);
    return { message: "Napaka pri pošiljanju emaila. Poskusite znova." };
  }

  return { success: "Nova koda je bila poslana na vaš email." };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email } = validated.data;

  // Preveri ali je email verificiran
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified && user.password) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  try {
    await signIn("credentials", {
      email,
      password: validated.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Napačen email ali geslo." };
        default:
          return { message: "Prišlo je do napake. Poskusite znova." };
      }
    }
    throw error;
  }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(
  state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get("email") as string)?.trim();

  if (!email) return { errors: { email: ["Vnesite email."] } };

  const user = await prisma.user.findUnique({ where: { email } });

  // Vedno vrni uspeh (prepreči ugibanje emailov)
  if (!user || !user.password) {
    return { success: "Če email obstaja, boste prejeli navodila za ponastavitev." };
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 ura

  await prisma.passwordResetToken.upsert({
    where: { email },
    update: { token, expires },
    create: { email, token, expires },
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch (err) {
    console.error("Email send failed:", err);
  }

  return { success: "Če email obstaja, boste prejeli navodila za ponastavitev." };
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(
  state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = formData.get("token") as string;
  const password = (formData.get("password") as string)?.trim();
  const confirm = (formData.get("confirm") as string)?.trim();

  if (password !== confirm) {
    return { errors: { confirm: ["Gesli se ne ujemata."] } };
  }

  const schema = z
    .string()
    .min(8, { message: "Geslo mora imeti vsaj 8 znakov." })
    .regex(/[a-zA-Z]/, { message: "Geslo mora vsebovati vsaj eno črko." })
    .regex(/[0-9]/, { message: "Geslo mora vsebovati vsaj eno številko." });

  const parsed = schema.safeParse(password);
  if (!parsed.success) {
    return { errors: { password: parsed.error.flatten().formErrors } };
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || new Date() > record.expires) {
    return { message: "Povezava je potekla ali ni veljavna. Zahtevajte novo." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email: record.email },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });

  redirect("/login?reset=1");
}
