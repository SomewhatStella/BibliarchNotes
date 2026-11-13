import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import PublicBoard from "@/components/PublicBoard";
import type { PublicStory } from "@/lib/public-links";

// Same pinch-zoom rules as the editor.
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };
export const dynamic = "force-dynamic";

const load = cache(async (token: string): Promise<PublicStory | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_story" as never, { p_token: token } as never);
  if (error || !data) return null;
  return data as unknown as PublicStory;
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const story = await load((await params).token);
  if (!story) return { title: "Link not available", robots: { index: false } };
  const by = story.author ? ` by ${story.author}` : "";
  const description = `A story board${by}, made with Bibliarch: characters, places and plot on one connected board. Free to use.`;
  return {
    title: story.title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title: `${story.title}${by} · Bibliarch`, description, siteName: "Bibliarch", type: "website" },
    twitter: { card: "summary", title: `${story.title}${by} · Bibliarch`, description },
  };
}

export default async function PublicStoryPage({ params }: { params: Promise<{ token: string }> }) {
  const story = await load((await params).token);
  if (!story) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-parchment-50 px-6 text-center">
        <p className="font-display text-[20px] font-semibold text-ink-900">This link isn&rsquo;t available</p>
        <p className="max-w-sm text-[14px] text-ink-500">Its owner may have turned it off. Ask them for a new one.</p>
        <Link href="/signup" className="mt-3 rounded-full bg-bibliarch-blue px-4 py-2 text-[13px] font-semibold text-white">
          Make your own story board, free
        </Link>
      </div>
    );
  }
  return <PublicBoard story={story} />;
}
