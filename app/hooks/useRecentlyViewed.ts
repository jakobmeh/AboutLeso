"use client";

import { useEffect } from "react";

const KEY = "leso_recently_viewed";
const MAX = 6;

export function trackView(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const filtered = existing.filter((s) => s !== slug);
    localStorage.setItem(KEY, JSON.stringify([slug, ...filtered].slice(0, MAX)));
  } catch {}
}

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useTrackView(slug: string) {
  useEffect(() => {
    trackView(slug);
  }, [slug]);
}
