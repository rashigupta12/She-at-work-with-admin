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

// ─── Category detection for entrechat ──────────────────────────────────────────

function getCategoryFromContent(content: string, title: string): string {
  const c = (content + " " + title).toLowerCase();
  
  // Entrechat-specific categories
  if (c.includes("interview") || c.includes("conversation") || c.includes("chat")) 
    return "Interviews";
  if (c.includes("story") || c.includes("journey") || c.includes("experience")) 
    return "Success Stories";
  if (c.includes("tips") || c.includes("advice") || c.includes("guidance")) 
    return "Advice & Tips";
  if (c.includes("women") || c.includes("female") || c.includes("she")) 
    return "Women in Business";
  if (c.includes("startup") || c.includes("entrepreneur") || c.includes("business")) 
    return "Entrepreneurship";
  if (c.includes("leadership") || c.includes("leader") || c.includes("mentor")) 
    return "Leadership";
  if (c.includes("innovation") || c.includes("tech") || c.includes("technology")) 
    return "Innovation";
  
  return "Entrechat";
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
    "women-entrepreneurs", "interview", "success-story", "leadership",
    "startup", "business-tips", "women-in-tech", "innovation", "mentorship",
    "female-founder", "entrepreneurship", "advice", "inspiration", "chat",
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

async function loadEntrehcatFromFile(filePath: string) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, "utf-8");

  let entrechat;
  if (filePath.endsWith(".ts")) {
    // More flexible regex to match export const variableName = [ ... ] with or without semicolon
    const match = raw.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/m);
    if (!match) {
      // Try without semicolon requirement
      const match2 = raw.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*?\])\s*$/m);
      if (!match2) {
        console.error("Could not parse array from .ts file. Raw content preview:");
        console.error(raw.substring(0, 200) + "...");
        throw new Error("Could not parse array from .ts file");
      }
      try {
        entrechat = new Function(`return ${match2[1]}`)();
      } catch (parseError) {
        console.error("Parse error:", parseError);
        console.error("Matched content:", match2[1].substring(0, 500) + "...");
        throw parseError;
      }
    } else {
      try {
        entrechat = new Function(`return ${match[1]}`)();
      } catch (parseError) {
        console.error("Parse error:", parseError);
        console.error("Matched content:", match[1].substring(0, 500) + "...");
        throw parseError;
      }
    }
  } else {
    entrechat = JSON.parse(raw);
  }

  console.log(`💬 Loaded ${entrechat.length} entrechat items from ${filePath}`);
  return entrechat;
}

// ─── Build category lookup map ────────────────────────────────────────────────

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "ENTRECHAT"));

  // Map: lowercase name → uuid
  const map = new Map(rows.map((r) => [r.name.toLowerCase(), r.id]));
  console.log(`📊 Found ${rows.length} ENTRECHAT categories in database`);

  if (rows.length === 0) {
    console.warn("⚠️  No ENTRECHAT categories found in database (this is OK, category can be null)");
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

// ─── Insert entrechat ─────────────────────────────────────────────────────────

async function insertEntrehcat(entrechatItems: any[], categoryMap: Map<string, string>) {
  console.log(`\n📥 Inserting ${entrechatItems.length} entrechat items…`);

  // Pre-fetch existing wpIds to skip duplicates
  const existing: any[] = await db
    .select({ wpId: ContentTable.wpId })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "ENTRECHAT"));

  const existingWpIds = new Set(existing.map((r) => r.wpId).filter(Boolean));
  console.log(`📊 ${existingWpIds.size} entrechat items already in database — will skip duplicates\n`);

  const stats = { inserted: 0, skipped: 0, failed: 0, tagsCreated: 0 };

  for (const entrechatItem of entrechatItems) {
    // Skip already-migrated posts
    if (entrechatItem.ID && existingWpIds.has(entrechatItem.ID)) {
      stats.skipped++;
      continue;
    }

    try {
      // Resolve category
      const categoryName = getCategoryFromContent(entrechatItem.post_content, entrechatItem.post_title);
      const categoryId = categoryMap.get(categoryName.toLowerCase()) ?? null;

      if (!categoryId) {
        console.warn(`  ⚠️  Category "${categoryName}" not found for: ${entrechatItem.post_title.substring(0, 50)}`);
      }

      const slug = generateSlug(entrechatItem);
      const summary = entrechatItem.post_excerpt?.trim()
        ? entrechatItem.post_excerpt.replace(/<[^>]*>/g, "").trim()
        : extractExcerpt(entrechatItem.post_content);
      const authorName = extractAuthor(entrechatItem.post_content, entrechatItem.post_author || "She at Work Team");
      const readingTime = calculateReadingTime(entrechatItem.post_content);
      const publishedAt = entrechatItem.post_date ? new Date(entrechatItem.post_date) : new Date();
      const updatedAt = entrechatItem.post_modified ? new Date(entrechatItem.post_modified) : publishedAt;
      const tags = extractTags(entrechatItem.post_content, entrechatItem.post_title);

      // Use a transaction PER entrechat item
      await db.transaction(async (tx: any) => {
        const [inserted]: any[] = await tx
          .insert(ContentTable)
          .values({
            wpId: entrechatItem.ID ?? null,
            title: entrechatItem.post_title.replace(/&amp;/g, "&"),
            slug,
            summary,
            content: entrechatItem.post_content,
            contentType: "ENTRECHAT",
            categoryId,
            authorName,
            featuredImage: entrechatItem.featured_image_url ?? null,
            externalUrl: entrechatItem.external_url ?? null,
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
      console.error(`  ❌ Failed entrechat ${entrechatItem.ID} "${entrechatItem.post_title?.substring(0, 40)}": ${err.message}`);
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
    .where(eq(ContentTable.contentType, "ENTRECHAT"));

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
  console.log(`💬 Entrehcat items in DB : ${counts.total}`);
  console.log(`✅ With category        : ${counts.withCategory}`);
  console.log(`⚠️  Without category    : ${counts.total - counts.withCategory}`);
  console.log(`🏷️  Unique tags          : ${tagCount.total}`);
  console.log("\n📈 Top 5 tags:");
  topTags.forEach((t: any, i: number) => console.log(`   ${i + 1}. ${t.name} (${t.usageCount})`));
  console.log("=".repeat(50));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log("🚀 Starting entrechat migration…");
  console.log("=".repeat(50));

  const filePath = process.argv[2] || "./src/data/Entrechat.ts";
  console.log(`📂 File: ${filePath}\n`);

  const rawEntrehcat = await loadEntrehcatFromFile(filePath);
  const categoryMap = await buildCategoryMap();
  const stats = await insertEntrehcat(rawEntrehcat, categoryMap);

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