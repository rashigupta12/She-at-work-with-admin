// NO "use client" — this is a Server Component
import { Navbar } from "@/components/navbar/Navbar";

import Cta from "@/components/common/Cta";

import { newsConfig } from "@/lib/pageConfigs";
import type { BaseApiResponse } from "@/components/content/types";
import { ContentBanner, ContentGridClient, FeaturedSection, fetchInitialContent } from "@/components/content";
import TopHeaderSection from "@/components/common/TopHeaderSection";
import { BannerDisplay } from "@/components/bannerNew/BannerDisplay";

// ISR: page HTML rebuilt every 60 seconds in the background.
// Returning visitors get instant cached HTML — no blank screen, no waterfall.
export const revalidate = 60;

export const metadata = {
  title:       "Women in Business News | She At Work",
  description: "Stay informed with the latest news, insights, and success stories from women entrepreneurs worldwide.",
};

export default async function NewsPage() {
  const data = (await fetchInitialContent("NEWS", 12)) as BaseApiResponse | null;

  const items      = data?.items      ?? [];
  const featured   = items[0]         ?? null;
  const headlines  = items.slice(0, 4);
  const categories = data?.categories ?? [];
  const buckets    = data?.readingTimes ?? [];

  return (
    <main className="bg-background min-h-screen">
      <Navbar />

      {/* ── Server-rendered, zero JS ──────────────────────────────────── */}
      {/* <ContentBanner
        bannerDesktop={newsConfig.bannerDesktop}
        bannerMobile={newsConfig.bannerMobile}
        bannerAlt={newsConfig.bannerAlt}
        bannerTitle={newsConfig.bannerTitle}
        bannerSubtitle={newsConfig.bannerSubtitle}
      /> */}
      <TopHeaderSection/>
      <BannerDisplay 
        page="/news" 
        position="top" 
        autoPlayInterval={4000}
      />
      <FeaturedSection
        featuredItem={featured}
        latestItems={headlines}
        config={newsConfig}
        gridSectionId={newsConfig.gridSectionId}
      />

      {/* ── Client island: only filters + grid are interactive ───────── */}
      <ContentGridClient
        config={newsConfig}
        initialItems={items}
        initialTotal={data?.totalItems ?? 0}
        initialPages={data?.totalPages ?? 1}
        categories={categories}
        readingTimeBuckets={buckets}
      />

      <Cta />
    </main>
  );
}