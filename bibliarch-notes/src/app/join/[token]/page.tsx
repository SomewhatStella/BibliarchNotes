"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { acceptShareInvite } from "@/lib/collaboration";

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "joining" | "success" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push(`/login?returnUrl=${encodeURIComponent(`/join/${token}`)}`);
        return;
      }
      setStatus("joining");
      try {
        const result = await acceptShareInvite(token);
        if (result.success && result.story_id) {
          setStatus("success");
          setTimeout(() => router.push(`/story/${result.story_id}`), 1200);
        } else {
          setError(result.error ?? "This invite link isn't valid.");
          setStatus("error");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong joining this project.");
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment-50 px-6">
      <div className="emboss w-full max-w-sm rounded-2xl p-7 text-center">
        {(status === "checking" || status === "joining") && (
          <>
            <Loader2 size={28} className="mx-auto animate-spin text-bibliarch-blue" />
            <p className="mt-3 text-[14px] text-ink-700">Joining the project…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={28} className="mx-auto text-bibliarch-blue" />
            <p className="mt-3 font-display text-[16px] font-semibold text-ink-900">You&rsquo;re in</p>
            <p className="mt-1 text-[13px] text-ink-500">Taking you to the board…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={28} className="mx-auto text-bibliarch-rose" />
            <p className="mt-3 font-display text-[16px] font-semibold text-ink-900">Couldn&rsquo;t join</p>
            <p className="mt-1 text-[13px] text-ink-500">{error}</p>
            <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-bibliarch-blue px-4 py-2 text-[13px] font-semibold text-white">
              <Users size={13} /> Back to your stories
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
