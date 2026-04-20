"use client";

import { useState } from "react";

export function TopBanner({ message }: { message: string; id?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative bg-[#c41230] text-white text-xs tracking-wide text-center py-2.5 px-10 font-medium">
      {message}
      <button
        onClick={() => setVisible(false)}
        aria-label="Zapri"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
