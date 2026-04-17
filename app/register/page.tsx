"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/app/actions/auth";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, undefined);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.3em] text-stone-800 uppercase">
            Leso
          </h1>
          <p className="mt-2 text-sm text-stone-500 tracking-wide">
            Ustvari račun
          </p>
        </div>

        <div className="bg-white border border-stone-200 shadow-sm p-8">
          {state?.message && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {state.message}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium tracking-widest text-stone-600 uppercase mb-2"
              >
                Ime in priimek
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full border border-stone-300 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-600 transition-colors"
                placeholder="Jana Novak"
              />
              {state?.errors?.name && (
                <p className="mt-1 text-xs text-red-500">{state.errors.name[0]}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium tracking-widest text-stone-600 uppercase mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full border border-stone-300 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-600 transition-colors"
                placeholder="vas@email.com"
              />
              {state?.errors?.email && (
                <p className="mt-1 text-xs text-red-500">{state.errors.email[0]}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium tracking-widest text-stone-600 uppercase mb-2"
              >
                Geslo
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full border border-stone-300 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-600 transition-colors"
                placeholder="••••••••"
              />
              {state?.errors?.password && (
                <ul className="mt-1 space-y-1">
                  {state.errors.password.map((err) => (
                    <li key={err} className="text-xs text-red-500">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-stone-400">
                Vsaj 8 znakov, ena črka in ena številka.
              </p>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-stone-800 text-white text-xs tracking-widest uppercase py-4 hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {pending ? "Ustvarjam račun..." : "Registracija"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-stone-400 tracking-wider uppercase">
                ali
              </span>
            </div>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 border border-stone-300 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Registracija z Google
          </button>

          <p className="mt-6 text-center text-sm text-stone-500">
            Že imate račun?{" "}
            <Link
              href="/login"
              className="text-stone-800 font-medium hover:underline"
            >
              Prijava
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
