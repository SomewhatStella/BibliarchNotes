"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// profiles.is_admin, same column storycanvas's own /admin pages already
// gate on — not reimplemented, just read the same way.
export function useAdminGate() {
  const [state, setState] = useState<"checking" | "admin" | "denied">("checking");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setState("denied");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", auth.user.id).single();
      setState(profile?.is_admin ? "admin" : "denied");
    })();
  }, []);

  return state;
}
