"use client";

import { useTransition } from "react";
import { cancelOrder } from "@/app/actions/admin-orders";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Res želiš preklicati naročilo?")) return;
    const fd = new FormData();
    fd.append("orderId", orderId);
    startTransition(() => cancelOrder(fd));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="inline-flex border border-red-200 px-3 py-1 text-[10px] tracking-widest uppercase text-red-500 hover:border-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
    >
      {pending ? "..." : "Prekliči"}
    </button>
  );
}
