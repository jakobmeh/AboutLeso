"use client";
import { useTrackView } from "@/app/hooks/useRecentlyViewed";
export function ViewTracker({ slug }: { slug: string }) {
  useTrackView(slug);
  return null;
}
