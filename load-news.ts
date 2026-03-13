import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  ContentTable,
  CategoriesTable,
  TagsTable,
  ContentTagsTable,
} from "@/db/schema";

// ─── Category detection for news ──────────────────────────────────────────────

function getCategoryFromContent(content: string, title: string): string {
  const c = (content + " " + title).toLowerCase();
  
  // News-specific categories
  if (c.includes("women entrepreneur") || c.includes("startup") || c.includes("business")) 
    return "Business & Entrepreneurship";
  if (c.includes("policy") || c.includes("government") || c.includes("regulation")) 
    return "Policy & Regulation";
  if (c.includes("technology") || c.includes("tech") || c.includes("digital")) 
    return "Technology & Innovation";
  if (c.includes("funding") || c.includes("investment") || c.includes("finance")) 
    return "Funding & Investment";
  if (c.includes("success") || c.includes("achievement") || c.includes("award")) 
    return "Success Stories";
  if (c.includes("leadership") || c.includes("women leader") || c.includes("empowerment")) 
    return "Leadership";
  if (c.includes("event") || c.includes("conference") || c.includes("summit")) 
    return "Events";
  
  return "News";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function extractAuthor(content: string, fallback = "She at Work Team"): string {
  const match =
    content.match(/by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i) ||
    content.match(/Written by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i) ||
    content.match(/Author:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  return match ? match[1] : fallback;
}

function extractTags(content: string, title: string): string[] {
  const tags = new Set<string>();
  const c = content.toLowerCase();
  const t = title.toLowerCase();

  const keywords = [
    "women-entrepreneurs", "startup", "business-growth", "funding",
    "leadership", "technology", "innovation", "success-story",
    "policy", "regulation", "empowerment", "women-led",
    "investment", "funding", "event", "news", "women-in-business",
  ];

  for (const kw of keywords) {
    if (c.includes(kw.replace(/-/g, " ")) || t.includes(kw.replace(/-/g, " "))) {
      tags.add(kw);
    }
  }

  // Extract #hashtags from content
  const hashtags = content.match(/#(\w+)/g) ?? [];
  for (const h of hashtags) {
    tags.add(h.replace("#", "").toLowerCase());
  }

  return [...tags];
}

function extractExcerpt(content: string, maxLength = 200): string {
  if (!content) return "";
  const plain = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return plain.length <= maxLength ? plain : plain.substring(0, maxLength) + "...";
}

/**
 * Slug: use post_name if available, else derive from title.
 * Always append last 6 chars of wpId to guarantee uniqueness
 */
function generateSlug(post: any): string {
  const base = post.post_name
    ? post.post_name.toLowerCase().replace(/[^\w-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : post.post_title.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${String(post.ID).slice(-6)}`;
}

// ─── Load file ────────────────────────────────────────────────────────────────

async function loadNewsFromFile(filePath: string) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, "utf-8");

  let news;
  if (filePath.endsWith(".ts")) {
    const match = raw.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/m);
    if (!match) throw new Error("Could not parse array from .ts file");
    news = new Function(`return ${match[1]}`)();
  } else {
    news = JSON.parse(raw);
  }

  console.log(`📰 Loaded ${news.length} news items from ${filePath}`);
  return news;
}

// ─── Build category lookup map ────────────────────────────────────────────────

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "NEWS"));

  // Map: lowercase name → uuid
  const map = new Map(rows.map((r) => [r.name.toLowerCase(), r.id]));
  console.log(`📊 Found ${rows.length} NEWS categories in database`);

  if (rows.length === 0) {
    console.warn("⚠️  No NEWS categories found in database (this is OK, category can be null)");
  }

  return map;
}

// ─── Get or create a tag ──────────────────────────────────────────────────────

async function getOrCreateTag(tx: any, tagName: string): Promise<string> {
  const slug = tagName.toLowerCase().replace(/\s+/g, "-");

  // Try to find existing tag
  const existing: any[] = await tx
    .select({ id: TagsTable.id })
    .from(TagsTable)
    .where(eq(TagsTable.name, tagName))
    .limit(1);

  if (existing.length > 0) {
    // Increment usage count
    await tx
      .update(TagsTable)
      .set({ usageCount: sql`${TagsTable.usageCount} + 1` })
      .where(eq(TagsTable.id, existing[0].id));
    return existing[0].id;
  }

  // Create new tag
  const [created]: any[] = await tx
    .insert(TagsTable)
    .values({ name: tagName, slug, usageCount: 1, createdAt: new Date() })
    .returning({ id: TagsTable.id });

  return created.id;
}

// ─── Insert news ──────────────────────────────────────────────────────────────

async function insertNews(newsItems: any[], categoryMap: Map<string, string>) {
  console.log(`\n📥 Inserting ${newsItems.length} news items…`);

  // Pre-fetch existing wpIds to skip duplicates
  const existing: any[] = await db
    .select({ wpId: ContentTable.wpId })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "NEWS"));

  const existingWpIds = new Set(existing.map((r) => r.wpId).filter(Boolean));
  console.log(`📊 ${existingWpIds.size} news items already in database — will skip duplicates\n`);

  const stats = { inserted: 0, skipped: 0, failed: 0, tagsCreated: 0 };

  for (const newsItem of newsItems) {
    // Skip already-migrated posts
    if (newsItem.ID && existingWpIds.has(newsItem.ID)) {
      stats.skipped++;
      continue;
    }

    try {
      // Resolve category
      const categoryName = getCategoryFromContent(newsItem.post_content, newsItem.post_title);
      const categoryId = categoryMap.get(categoryName.toLowerCase()) ?? null;

      if (!categoryId) {
        console.warn(`  ⚠️  Category "${categoryName}" not found for: ${newsItem.post_title.substring(0, 50)}`);
      }

      const slug = generateSlug(newsItem);
      const summary = newsItem.post_excerpt?.trim()
        ? newsItem.post_excerpt.replace(/<[^>]*>/g, "").trim()
        : extractExcerpt(newsItem.post_content);
      const authorName = extractAuthor(newsItem.post_content, newsItem.post_author || "She at Work Team");
      const readingTime = calculateReadingTime(newsItem.post_content);
      const publishedAt = newsItem.post_date ? new Date(newsItem.post_date) : new Date();
      const updatedAt = newsItem.post_modified ? new Date(newsItem.post_modified) : publishedAt;
      const tags = extractTags(newsItem.post_content, newsItem.post_title);

      // Use a transaction PER news item
      await db.transaction(async (tx: any) => {
        const [inserted]: any[] = await tx
          .insert(ContentTable)
          .values({
            wpId: newsItem.ID ?? null,
            title: newsItem.post_title.replace(/&amp;/g, "&"),
            slug,
            summary,
            content: newsItem.post_content,
            contentType: "NEWS",
            categoryId,
            authorName,
            featuredImage: newsItem.featured_image_url ?? null,
            externalUrl: newsItem.external_url ?? null,
            readingTime,
            status: "PUBLISHED",
            publishedAt,
            createdAt: publishedAt,
            updatedAt,
          })
          .returning({ id: ContentTable.id });

        // Insert tags
        for (const tagName of tags) {
          try {
            const tagId = await getOrCreateTag(tx, tagName);
            await tx
              .insert(ContentTagsTable)
              .values({ contentId: inserted.id, tagId, createdAt: new Date() })
              .onConflictDoNothing();
          } catch (tagErr: any) {
            console.warn(`    ⚠️  Tag "${tagName}" skipped: ${tagErr.message}`);
          }
        }
      });

      stats.inserted++;

      // Progress log every 50
      if (stats.inserted % 50 === 0) {
        console.log(`  … ${stats.inserted} inserted, ${stats.skipped} skipped, ${stats.failed} failed`);
      }

    } catch (err: any) {
      console.error(`  ❌ Failed news ${newsItem.ID} "${newsItem.post_title?.substring(0, 40)}": ${err.message}`);
      stats.failed++;
    }
  }

  return stats;
}

// ─── Verify ───────────────────────────────────────────────────────────────────

async function verify() {
  console.log("\n🔍 Verifying…");

  const [counts]: any[] = await db
    .select({
      total: sql`count(*)`.mapWith(Number),
      withCategory: sql`count(case when category_id is not null then 1 end)`.mapWith(Number),
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "NEWS"));

  const [tagCount]: any[] = await db
    .select({ total: sql`count(*)`.mapWith(Number) })
    .from(TagsTable);

  const topTags = await db
    .select({ name: TagsTable.name, usageCount: TagsTable.usageCount })
    .from(TagsTable)
    .orderBy(sql`${TagsTable.usageCount} desc`)
    .limit(5);

  console.log("\n📊 RESULTS");
  console.log("=".repeat(50));
  console.log(`📰 News items in DB   : ${counts.total}`);
  console.log(`✅ With category      : ${counts.withCategory}`);
  console.log(`⚠️  Without category  : ${counts.total - counts.withCategory}`);
  console.log(`🏷️  Unique tags        : ${tagCount.total}`);
  console.log("\n📈 Top 5 tags:");
  topTags.forEach((t: any, i: number) => console.log(`   ${i + 1}. ${t.name} (${t.usageCount})`));
  console.log("=".repeat(50));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log("🚀 Starting news migration…");
  console.log("=".repeat(50));

  const filePath = process.argv[2] || "./src/data/news.ts";
  console.log(`📂 File: ${filePath}\n`);

  const rawNews = await loadNewsFromFile(filePath);
  const categoryMap = await buildCategoryMap();
  const stats = await insertNews(rawNews, categoryMap);

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log("\n📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Inserted : ${stats.inserted}`);
  console.log(`⏭️  Skipped  : ${stats.skipped}`);
  console.log(`❌ Failed   : ${stats.failed}`);
  console.log(`⏱️  Duration : ${duration}s`);
  console.log("=".repeat(50));

  await verify();

  console.log("\n✅ Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
