// Same Supabase project as storycanvas (stella/storycanvas) — same URL, same
// anon key, same RLS rules. This is not a copy of the data; it's a second
// client reading and writing the same rows, same auth.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
