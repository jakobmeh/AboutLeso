"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { verifyEmail, resendVerificationCode } from "@/app/actions/auth";

function VerifyEmailForm() {
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyEmail, undefined);
  const [resendState, resendAction, resendPending] = useActionState(resendVerificationCode, undefined);
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.3em] text-stone-800 uppercase">
            Leso
          </h1>
          <p className="mt-2 text-sm text-stone-500 tracking-wide">
            Potrdite vaš email
          </p>
        </div>

        <div className="bg-white border border-stone-200 shadow-sm p-8">
          <p className="text-sm text-stone-600 text-center mb-6">
            Poslali smo 6-mestno kodo na{" "}
            <span className="font-medium text-stone-800">{email}</span>.
            Vnesite jo spodaj.
          </p>

          {verifyState?.message && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {verifyState.message}
            </div>
          )}

          <form action={verifyAction} className="space-y-5">
            <input type="hidden" name="email" value={email} />

            <div>
              <label
                htmlFor="code"
                className="block text-xs font-medium tracking-widest text-stone-600 uppercase mb-2"
              >
                Koda
              </label>
              <input
                id="code"
                name="code"
                type="text"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className="w-full border border-stone-300 px-4 py-3 text-center text-2xl tracking-[0.5em] text-stone-800 placeholder-stone-300 focus:outline-none focus:border-stone-600 transition-colors"
                placeholder="––––––"
              />
            </div>

            <button
              type="submit"
              disabled={verifyPending}
              className="w-full bg-stone-800 text-white text-xs tracking-widest uppercase py-4 hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyPending ? "Preverjam..." : "Potrdi email"}
            </button>
          </form>

          <div className="mt-6 border-t border-stone-100 pt-6">
            {resendState?.success && (
              <p className="text-green-600 text-sm text-center mb-3">
                {resendState.success}
              </p>
            )}
            {resendState?.message && (
              <p className="text-red-500 text-sm text-center mb-3">
                {resendState.message}
              </p>
            )}
            <form action={resendAction}>
              <input type="hidden" name="email" value={email} />
              <button
                type="submit"
                disabled={resendPending}
                className="w-full text-sm text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50"
              >
                {resendPending ? "Pošiljam..." : "Pošlji novo kodo"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
