"use client";

import { useState, useEffect } from "react";

export function TopBanner({ message, id }: { message: string; id: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`banner-${id}`);
    if (!dismissed) setVisible(true);
  }, [id]);

  function dismiss() {
    localStorage.setItem(`banner-${id}`, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative bg-stone-900 text-white text-xs text-center py-2.5 px-10">
      {message}
      <button
        onClick={dismiss}
        aria-label="Zapri"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
