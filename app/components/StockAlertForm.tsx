"use client";

import { useState, useTransition } from "react";
import { subscribeStockAlert } from "@/app/actions/stockAlert";

export function StockAlertForm({
  variantId,
  size,
  userEmail,
}: {
  variantId: string;
  size: string;
  userEmail?: string | null;
}) {
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState(userEmail ?? "");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("variantId", variantId);
    fd.append("email", email);
    startTransition(async () => {
      await subscribeStockAlert(fd);
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="text-xs text-stone-500 py-2">
        Obvestili vas bomo, ko bo velikost <strong>{size}</strong> spet na zalogi.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-1">
      {!userEmail && (
        <input
          type="email"
          required
          placeholder="Vaš email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 text-xs border border-stone-200 px-3 py-2 outline-none focus:border-stone-500"
        />
      )}
      <button
        type="submit"
        disabled={pending}
        className="text-xs tracking-widest uppercase border border-stone-300 px-4 py-2 hover:border-stone-900 hover:text-stone-900 transition-colors disabled:opacity-50"
      >
        {userEmail ? `Obvesti me (${size})` : "Obvesti me"}
      </button>
    </form>
  );
}
