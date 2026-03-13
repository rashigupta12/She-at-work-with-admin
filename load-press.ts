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

// ─── Category detection for press ─────────────────────────────────────────────

function getCategoryFromContent(content: string, title: string): string {
  const c = (content + " " + title).toLowerCase();
  
  // Press-specific categories
  if (c.includes("announcement") || c.includes("launch") || c.includes("release")) 
    return "Announcements";
  if (c.includes("partnership") || c.includes("collaboration") || c.includes("alliance")) 
    return "Partnerships";
  if (c.includes("award") || c.includes("recognition") || c.includes("achievement")) 
    return "Awards & Recognition";
  if (c.includes("event") || c.includes("conference") || c.includes("summit")) 
    return "Events";
  if (c.includes("milestone") || c.includes("achievement") || c.includes("growth")) 
    return "Milestones";
  if (c.includes("media") || c.includes("coverage") || c.includes("interview")) 
    return "Media Coverage";
  
  return "Press Releases";
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
    "press-release", "announcement", "launch", "partnership",
    "award", "recognition", "event", "conference", "milestone",
    "media-coverage", "achievement", "collaboration", "news",
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

async function loadPressFromFile(filePath: string) {
  // Import .ts file directly using dynamic import
  if (filePath.endsWith(".ts")) {
    const module = await import(filePath);
    const pressData = module.pressData;
    console.log(`📰 Loaded ${pressData.length} press items from ${filePath}`);
    return pressData;
  } else {
    throw new Error("Only .ts files are supported for press data");
  }
}

// ─── Build category lookup map ────────────────────────────────────────────────

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "PRESS"));

  // Map: lowercase name → uuid
  const map = new Map(rows.map((r) => [r.name.toLowerCase(), r.id]));
  console.log(`📊 Found ${rows.length} PRESS categories in database`);

  if (rows.length === 0) {
    console.warn("⚠️  No PRESS categories found in database (this is OK, category can be null)");
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

// ─── Insert press ─────────────────────────────────────────────────────────────

async function insertPress(pressItems: any[], categoryMap: Map<string, string>) {
  console.log(`\n📥 Inserting ${pressItems.length} press items…`);

  // Delete existing PRESS content to allow re-insertion of updated data
  const deletedCount = await db.delete(ContentTable).where(eq(ContentTable.contentType, "PRESS"));
  console.log(`🗑️  Deleted ${deletedCount} existing PRESS content`);

  const stats = { inserted: 0, skipped: 0, failed: 0, tagsCreated: 0 };

  for (const pressItem of pressItems) {
    try {
      // Resolve category
      const categoryName = getCategoryFromContent(pressItem.post_content, pressItem.post_title);
      const categoryId = categoryMap.get(categoryName.toLowerCase()) ?? null;

      if (!categoryId) {
        console.warn(`  ⚠️  Category "${categoryName}" not found for: ${pressItem.post_title.substring(0, 50)}`);
      }

      const slug = generateSlug(pressItem);
      const summary = pressItem.post_excerpt?.trim()
        ? pressItem.post_excerpt.replace(/<[^>]*>/g, "").trim()
        : extractExcerpt(pressItem.post_content);
      const authorName = extractAuthor(pressItem.post_content, pressItem.post_author || "She at Work Team");
      const readingTime = calculateReadingTime(pressItem.post_content);
      const publishedAt = pressItem.post_date ? new Date(pressItem.post_date) : new Date();
      const updatedAt = pressItem.post_modified ? new Date(pressItem.post_modified) : publishedAt;
      const tags = extractTags(pressItem.post_content, pressItem.post_title);

      // Use a transaction PER press item
      await db.transaction(async (tx: any) => {
        const [inserted]: any[] = await tx
          .insert(ContentTable)
          .values({
            wpId: pressItem.ID ?? null,
            title: pressItem.post_title.replace(/&amp;/g, "&"),
            slug,
            summary,
            content: pressItem.post_content,
            contentType: "PRESS",
            categoryId,
            authorName,
            featuredImage: pressItem.featured_image_url ?? null,
            externalUrl: pressItem.external_url ?? null,
            contentImages: pressItem.content_images || null,
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

      // Progress log every 10
      if (stats.inserted % 10 === 0) {
        console.log(`  … ${stats.inserted} inserted`);
      }

    } catch (err: any) {
      console.error(`  ❌ Failed press ${pressItem.ID} "${pressItem.post_title?.substring(0, 40)}": ${err.message}`);
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
    .where(eq(ContentTable.contentType, "PRESS"));

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
  console.log(`📰 Press items in DB  : ${counts.total}`);
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
  console.log("🚀 Starting press migration…");
  console.log("=".repeat(50));

  const filePath = process.argv[2] || "./src/data/Press.ts";
  console.log(`📂 File: ${filePath}\n`);

  const rawPress = await loadPressFromFile(filePath);
  const categoryMap = await buildCategoryMap();
  const stats = await insertPress(rawPress, categoryMap);

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log("\n📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Inserted : ${stats.inserted}`);
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