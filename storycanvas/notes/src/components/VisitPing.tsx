"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordVisit } from "@/lib/visits";

/** Counts each page a not-signed-in visitor opens (see lib/visits.ts). */
export function VisitPing() {
  const path = usePathname();
  useEffect(() => {
    void recordVisit(createClient());
  }, [path]);
  return null;
}
