import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { ContentTable, CategoriesTable } from "@/db/schema";

console.log("🚀 Fixing ENTRECHAT category mapping (FINAL PRODUCTION)...");

// ---------- CATEGORY DETECTION ----------

function detectCategory(title = "", content = "") {
  const t = (title + " " + content).toLowerCase();

  if (t.includes("design") || t.includes("architecture") || t.includes("interior"))
    return "Design & Architecture";

  if (t.includes("funding") || t.includes("finance") || t.includes("investment"))
    return "Funding & Finance";

  if (t.includes("leadership") || t.includes("ceo") || t.includes("director"))
    return "Leadership";

  if (t.includes("marketing") || t.includes("brand") || t.includes("social media"))
    return "Marketing";

  if (t.includes("product") || t.includes("innovation") || t.includes("development"))
    return "Product Development";

  if (t.includes("tech") || t.includes("technology") || t.includes("ai") || t.includes("digital"))
    return "Technology";

  if (t.includes("health") || t.includes("wellness") || t.includes("yoga"))
    return "Wellness & Health";

  if (t.includes("work-life") || t.includes("family") || t.includes("balance"))
    return "Work-Life Balance";

  return "Entrepreneurship";
}

// ---------- CATEGORY MAP ----------

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "ENTRECHAT"));

  const map = new Map(rows.map(r => [r.name.toLowerCase(), r.id]));

  console.log(`📊 Found ${rows.length} ENTRECHAT categories`);
  return map;
}

// ---------- MAIN FIX ----------

async function fixEntrehcatCategories() {
  const categoryMap = await buildCategoryMap();

  const items = await db
    .select({
      id: ContentTable.id,
      title: ContentTable.title,
      content: ContentTable.content,
      categoryId: ContentTable.categoryId,
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "ENTRECHAT"));

  console.log(`💬 Found ${items.length} ENTRECHAT items`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.categoryId) {
        skipped++;
        continue;
      }

      const categoryName = detectCategory(item.title, item.content);
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
    .where(eq(ContentTable.contentType, "ENTRECHAT"));

  console.log("Total:", stats.total);
  console.log("With category:", stats.withCategory);
  console.log("Without category:", stats.total - stats.withCategory);

  console.log("✅ ENTRECHAT CATEGORY FIX DONE");
}

fixEntrehcatCategories();