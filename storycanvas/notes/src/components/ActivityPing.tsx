"use client";
import { useEffect } from "react";
import { recordActivity } from "@/lib/activity";

/** Counts today's visit once, and again if a tab is left open past midnight. */
export function ActivityPing() {
  useEffect(() => {
    void recordActivity();
    const again = () => {
      if (document.visibilityState === "visible") void recordActivity();
    };
    document.addEventListener("visibilitychange", again);
    window.addEventListener("focus", again);
    const timer = setInterval(again, 30 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("focus", again);
      clearInterval(timer);
    };
  }, []);
  return null;
}
