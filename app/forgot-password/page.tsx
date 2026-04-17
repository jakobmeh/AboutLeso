"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.3em] text-stone-800 uppercase">
            Leso
          </h1>
          <p className="mt-2 text-sm text-stone-500 tracking-wide">
            Pozabljeno geslo
          </p>
        </div>

        <div className="bg-white border border-stone-200 shadow-sm p-8">
          {state?.success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-stone-600">{state.success}</p>
              <Link
                href="/login"
                className="mt-6 inline-block text-xs tracking-widest uppercase text-stone-500 hover:text-stone-800 transition-colors"
              >
                Nazaj na prijavo
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-600 mb-6">
                Vnesite vaš email naslov in poslali vam bomo povezavo za ponastavitev gesla.
              </p>

              {state?.message && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                  {state.message}
                </div>
              )}

              <form action={action} className="space-y-5">
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

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full bg-stone-800 text-white text-xs tracking-widest uppercase py-4 hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? "Pošiljam..." : "Pošlji navodila"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-stone-500">
                <Link href="/login" className="text-stone-800 font-medium hover:underline">
                  Nazaj na prijavo
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
