import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { ContentTable, CategoriesTable } from "@/db/schema";

console.log("🚀 Fixing PRESS category mapping (FINAL PRODUCTION)...");

// ---------- CATEGORY DETECTION ----------

function detectPressCategory(title = "", content = "") {
  const t = (title + " " + content).toLowerCase();

  if (
    t.includes("partnership") ||
    t.includes("collaboration") ||
    t.includes("alliance") ||
    t.includes("mou")
  ) return "Partnership Announcements";

  if (
    t.includes("ceo") ||
    t.includes("appointment") ||
    t.includes("leadership") ||
    t.includes("director")
  ) return "Executive Announcements";

  if (
    t.includes("launch") ||
    t.includes("product") ||
    t.includes("introduce") ||
    t.includes("unveil")
  ) return "Product Launches";

  if (
    t.includes("media") ||
    t.includes("coverage") ||
    t.includes("featured") ||
    t.includes("press coverage")
  ) return "Media Coverage";

  if (
    t.includes("announcement") ||
    t.includes("announces") ||
    t.includes("update") ||
    t.includes("expansion")
  ) return "Company Announcements";

  return "Press Release";
}

// ---------- CATEGORY MAP ----------

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "PRESS"));

  const map = new Map(rows.map(r => [r.name.toLowerCase(), r.id]));

  console.log(`📊 Found ${rows.length} PRESS categories`);
  return map;
}

// ---------- MAIN FIX ----------

async function fixPressCategories() {
  const categoryMap = await buildCategoryMap();

  const items = await db
    .select({
      id: ContentTable.id,
      title: ContentTable.title,
      content: ContentTable.content,
      categoryId: ContentTable.categoryId,
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "PRESS"));

  console.log(`📰 Found ${items.length} PRESS items`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.categoryId) {
        skipped++;
        continue;
      }

      const categoryName = detectPressCategory(item.title, item.content);
      const categoryId = categoryMap.get(categoryName.toLowerCase());

      if (!categoryId) {
        console.log(`⚠️ Category missing: ${categoryName}`);
        failed++;
        continue;
      }

      await db
        .update(ContentTable)
        .set({ categoryId })
        .where(eq(ContentTable.id, item.id));

      updated++;

    } catch (err) {
      console.log(`❌ Failed: ${item.title}`);
      failed++;
    }
  }

  console.log("\n====== RESULT ======");
  console.log("Updated:", updated);
  console.log("Skipped:", skipped);
  console.log("Failed:", failed);

  const [stats] = await db
    .select({
      total: sql`count(*)`.mapWith(Number),
      withCategory: sql`count(case when category_id is not null then 1 end)`.mapWith(Number),
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "PRESS"));

  console.log("Total:", stats.total);
  console.log("With category:", stats.withCategory);
  console.log("Without category:", stats.total - stats.withCategory);

  console.log("✅ PRESS CATEGORY FIX DONE");
}

fixPressCategories();