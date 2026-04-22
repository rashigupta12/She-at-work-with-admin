// NO "use client" — Server Component
import { Navbar } from "@/components/navbar/Navbar";

import Cta from "@/components/common/Cta";

import { blogsConfig } from "@/lib/pageConfigs";
import type { BaseApiResponse } from "@/components/content/types";
import { ContentBanner, ContentGridClient, FeaturedSection, fetchInitialContent } from "@/components/content";
import { BannerDisplay } from "@/components/bannerNew/BannerDisplay";

export const revalidate = 60;

export const metadata = {
  title:       "Inspiring Blogs | She At Work",
  description: "Explore real insights, bold conversations, and practical guidance for women entrepreneurs.",
};

export default async function BlogsPage() {
  const data = (await fetchInitialContent("BLOG", 12)) as BaseApiResponse | null;

  const items      = data?.items      ?? [];
  const featured   = items[0]         ?? null;
  const headlines  = items.slice(0, 4);
  const categories = data?.categories ?? [];
  const buckets    = data?.readingTimes ?? [];

  return (
    <main className="bg-background min-h-screen">
      <Navbar />

      {/* <ContentBanner
        bannerDesktop={blogsConfig.bannerDesktop}
        bannerMobile={blogsConfig.bannerMobile}
        bannerAlt={blogsConfig.bannerAlt}
        bannerTitle={blogsConfig.bannerTitle}
        bannerSubtitle={blogsConfig.bannerSubtitle}
      /> */}

      <BannerDisplay 
        page="/blogs" 
        position="top" 
        autoPlayInterval={4000}
      />

      <FeaturedSection
        featuredItem={featured}
        latestItems={headlines}
        config={blogsConfig}
        gridSectionId={blogsConfig.gridSectionId}
      />

      <ContentGridClient
        config={blogsConfig}
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