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

// ─── Category detection for events ────────────────────────────────────────────
// this is deliberately simple; we only have a handful of event categories in the
// database today, but you can expand the rules below if you like.

function getCategoryFromEvent(content: string, title: string): string {
  const c = (content + " " + title).toLowerCase();

  if (c.includes("webinar") || c.includes("online")) return "Webinars";
  if (c.includes("conference") || c.includes("summit")) return "Conferences";
  if (c.includes("workshop") || c.includes("training")) return "Workshops";
  if (c.includes("dialogue") || c.includes("forum") || c.includes("panel"))
    return "Dialogues";
  if (c.includes("award") || c.includes("felicitation")) return "Awards";

  return "Events"; // fallback category
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
    "webinar",
    "conference",
    "summit",
    "workshop",
    "dialogue",
    "award",
    "programme",
    "leadership",
    "innovation",
    "youth",
    "women",
    "entrepreneurship",
  ];

  for (const kw of keywords) {
    if (c.includes(kw) || t.includes(kw)) {
      tags.add(kw.replace(/\s+/g, "-"));
    }
  }

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

function generateSlug(post: any): string {
  const base = post.post_name
    ? post.post_name.toLowerCase().replace(/[^\w-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : post.post_title.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${String(post.ID).slice(-6)}`;
}

// ─── Load file ────────────────────────────────────────────────────────────────

async function loadEventsFromFile(filePath: string) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, "utf-8");

  let events;
  if (filePath.endsWith(".ts")) {
    const match = raw.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/m);
    if (!match) {
      const match2 = raw.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*?\])\s*$/m);
      if (!match2) {
        console.error("Could not parse array from .ts file. Raw content preview:");
        console.error(raw.substring(0, 200) + "...");
        throw new Error("Could not parse array from .ts file");
      }
      try {
        events = new Function(`return ${match2[1]}`)();
      } catch (parseError) {
        console.error("Parse error:", parseError);
        console.error("Matched content:", match2[1].substring(0, 500) + "...");
        throw parseError;
      }
    } else {
      try {
        events = new Function(`return ${match[1]}`)();
      } catch (parseError) {
        console.error("Parse error:", parseError);
        console.error("Matched content:", match[1].substring(0, 500) + "...");
        throw parseError;
      }
    }
  } else {
    events = JSON.parse(raw);
  }

  console.log(`💬 Loaded ${events.length} event items from ${filePath}`);
  return events;
}

// rest of script parallels load-entrehcat but adjusted to EVENT

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "EVENT"));

  const map = new Map(rows.map((r) => [r.name.toLowerCase(), r.id]));
  console.log(`📊 Found ${rows.length} EVENT categories in database`);

  if (rows.length === 0) {
    console.warn("⚠️  No EVENT categories found in database (this is OK, category can be null)");
  }

  return map;
}

async function getOrCreateTag(tx: any, tagName: string): Promise<string> {
  const slug = tagName.toLowerCase().replace(/\s+/g, "-");

  const existing: any[] = await tx
    .select({ id: TagsTable.id })
    .from(TagsTable)
    .where(eq(TagsTable.name, tagName))
    .limit(1);

  if (existing.length > 0) {
    await tx
      .update(TagsTable)
      .set({ usageCount: sql`${TagsTable.usageCount} + 1` })
      .where(eq(TagsTable.id, existing[0].id));
    return existing[0].id;
  }

  const [created]: any[] = await tx
    .insert(TagsTable)
    .values({ name: tagName, slug, usageCount: 1, createdAt: new Date() })
    .returning({ id: TagsTable.id });

  return created.id;
}

async function insertEvents(eventItems: any[], categoryMap: Map<string, string>) {
  console.log(`\n📥 Inserting ${eventItems.length} event items…`);

  const existing: any[] = await db
    .select({ wpId: ContentTable.wpId })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "EVENT"));

  const existingWpIds = new Set(existing.map((r) => r.wpId).filter(Boolean));
  console.log(`📊 ${existingWpIds.size} event items already in database — will skip duplicates\n`);

  const stats = { inserted: 0, skipped: 0, failed: 0, tagsCreated: 0 };

  for (const item of eventItems) {
    if (item.ID && existingWpIds.has(item.ID)) {
      stats.skipped++;
      continue;
    }

    try {
      const categoryName = getCategoryFromEvent(item.post_content, item.post_title);
      const categoryId = categoryMap.get(categoryName.toLowerCase()) ?? null;

      if (!categoryId) {
        console.warn(`  ⚠️  Category "${categoryName}" not found for: ${item.post_title.substring(0, 50)}`);
      }

      const slug = generateSlug(item);
      const summary = item.post_excerpt?.trim()
        ? item.post_excerpt.replace(/<[^>]*>/g, "").trim()
        : extractExcerpt(item.post_content);
      const authorName = extractAuthor(item.post_content, item.post_author || "She at Work Team");
      const readingTime = calculateReadingTime(item.post_content);
      const publishedAt = item.post_date ? new Date(item.post_date) : new Date();
      const updatedAt = item.post_modified ? new Date(item.post_modified) : publishedAt;
      const tags = extractTags(item.post_content, item.post_title);

      await db.transaction(async (tx: any) => {
        const [inserted]: any[] = await tx
          .insert(ContentTable)
          .values({
            wpId: item.ID ?? null,
            title: item.post_title.replace(/&amp;/g, "&"),
            slug,
            summary,
            content: item.post_content,
            contentType: "EVENT",
            categoryId,
            authorName,
            featuredImage: item.featured_image_url ?? null,
            externalUrl: item.external_url ?? null,
            readingTime,
            status: "PUBLISHED",
            publishedAt,
            createdAt: publishedAt,
            updatedAt,
          })
          .returning({ id: ContentTable.id });

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
      if (stats.inserted % 50 === 0) {
        console.log(`  … ${stats.inserted} inserted, ${stats.skipped} skipped, ${stats.failed} failed`);
      }
    } catch (err: any) {
      console.error(`  ❌ Failed event ${item.ID} "${item.post_title?.substring(0, 40)}": ${err.message}`);
      stats.failed++;
    }
  }

  return stats;
}

async function verify() {
  console.log("\n🔍 Verifying…");

  const [counts]: any[] = await db
    .select({
      total: sql`count(*)`.mapWith(Number),
      withCategory: sql`count(case when category_id is not null then 1 end)`.mapWith(Number),
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "EVENT"));

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
  console.log(`💬 Event items in DB : ${counts.total}`);
  console.log(`✅ With category        : ${counts.withCategory}`);
  console.log(`⚠️  Without category    : ${counts.total - counts.withCategory}`);
  console.log(`🏷️  Unique tags          : ${tagCount.total}`);
  console.log("\n📈 Top 5 tags:");
  topTags.forEach((t: any, i: number) => console.log(`   ${i + 1}. ${t.name} (${t.usageCount})`));
  console.log("=".repeat(50));
}

async function main() {
  const start = Date.now();
  console.log("🚀 Starting event migration…");
  console.log("=".repeat(50));

  const filePath = process.argv[2] || "./src/data/events.ts";
  console.log(`📂 File: ${filePath}\n`);

  const rawEvents = await loadEventsFromFile(filePath);
  const categoryMap = await buildCategoryMap();
  const stats = await insertEvents(rawEvents, categoryMap);

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
