"use client";

import { useState, useTransition } from "react";
import { submitReview, deleteReview } from "@/app/actions/reviews";

type Review = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  user: { name: string | null };
};

function Stars({ rating, interactive, onSelect }: { rating: number; interactive?: boolean; onSelect?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          onClick={() => interactive && onSelect?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? "cursor-pointer" : "cursor-default pointer-events-none"}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4"
            fill={(interactive ? (hover || rating) : rating) >= star ? "#1c1917" : "none"}
            stroke="#1c1917" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({
  productId,
  reviews,
  avgRating,
  isLoggedIn,
  userReview,
  hasPurchased,
}: {
  productId: string;
  reviews: Review[];
  avgRating: number;
  isLoggedIn: boolean;
  userReview: Review | null;
  hasPurchased: boolean;
}) {
  const [rating, setRating] = useState(userReview?.rating ?? 0);
  const [body, setBody] = useState(userReview?.body ?? "");
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("rating", String(rating));
    fd.append("body", body);
    startTransition(async () => {
      await submitReview(fd);
      setShowForm(false);
    });
  }

  function handleDelete() {
    startTransition(() => deleteReview(productId));
  }

  return (
    <div className="mt-16 border-t border-stone-100 pt-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-light tracking-tight text-stone-900">Ocene</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm text-stone-500">{avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "ocena" : "ocen"}</span>
            </div>
          )}
        </div>
        {isLoggedIn && hasPurchased && !userReview && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="text-xs tracking-widest uppercase border border-stone-200 px-4 py-2 hover:border-stone-900 transition-colors">
            Oceni izdelek
          </button>
        )}
      </div>

      {/* Write review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 border border-stone-100 p-5 space-y-4">
          <div>
            <p className="text-xs text-stone-400 tracking-widest uppercase mb-2">Tvoja ocena</p>
            <Stars rating={rating} interactive onSelect={setRating} />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Napiši mnenje (neobvezno)..."
            rows={3}
            className="w-full text-sm border border-stone-200 px-3 py-2 outline-none focus:border-stone-500 resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={!rating || pending}
              className="text-xs tracking-widest uppercase bg-stone-900 text-white px-6 py-2 hover:bg-stone-700 disabled:opacity-40 transition-colors">
              Objavi
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-xs tracking-widest uppercase border border-stone-200 px-6 py-2 hover:border-stone-900 transition-colors">
              Prekliči
            </button>
          </div>
        </form>
      )}

      {/* User's existing review */}
      {userReview && !showForm && (
        <div className="mb-6 border border-stone-100 p-4 bg-stone-50/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Stars rating={userReview.rating} />
              <span className="text-xs text-stone-400">Tvoja ocena</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRating(userReview.rating); setBody(userReview.body ?? ""); setShowForm(true); }}
                className="text-xs text-stone-400 hover:text-stone-700 underline transition-colors">Uredi</button>
              <button onClick={handleDelete} disabled={pending}
                className="text-xs text-red-400 hover:text-red-600 underline transition-colors">Izbriši</button>
            </div>
          </div>
          {userReview.body && <p className="text-sm text-stone-600 mt-1">{userReview.body}</p>}
        </div>
      )}

      {/* All reviews */}
      {reviews.length === 0 ? (
        <p className="text-sm text-stone-400">
          {isLoggedIn && hasPurchased ? "Bodi prvi, ki oceni ta izdelek." : "Še ni ocen."}
        </p>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-stone-50 pb-5">
              <div className="flex items-center gap-2 mb-1">
                <Stars rating={r.rating} />
                <span className="text-xs text-stone-500 font-medium">{r.user.name ?? "Kupec"}</span>
                <span className="text-xs text-stone-300">·</span>
                <span className="text-xs text-stone-300">
                  {new Date(r.createdAt).toLocaleDateString("sl-SI")}
                </span>
              </div>
              {r.body && <p className="text-sm text-stone-600 leading-relaxed">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
