"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="border border-stone-300 px-6 py-2 text-xs tracking-widest uppercase text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors print:hidden"
    >
      Izvozi PDF
    </button>
  );
}
