"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string };
}) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-[0.3em] text-stone-800 uppercase">
            Leso
          </h1>
          <p className="mt-2 text-sm text-stone-500 tracking-wide">
            Novo geslo
          </p>
        </div>

        <div className="bg-white border border-stone-200 shadow-sm p-8">
          {state?.message && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {state.message}
            </div>
          )}

          <form action={action} className="space-y-5">
            <input type="hidden" name="token" value={params.token} />

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium tracking-widest text-stone-600 uppercase mb-2"
              >
                Novo geslo
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
                    <li key={err} className="text-xs text-red-500">{err}</li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-stone-400">
                Vsaj 8 znakov, ena črka in ena številka.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-xs font-medium tracking-widest text-stone-600 uppercase mb-2"
              >
                Ponovi geslo
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                className="w-full border border-stone-300 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-600 transition-colors"
                placeholder="••••••••"
              />
              {state?.errors?.confirm && (
                <p className="mt-1 text-xs text-red-500">{state.errors.confirm[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-stone-800 text-white text-xs tracking-widest uppercase py-4 hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Shranjujem..." : "Nastavi novo geslo"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
