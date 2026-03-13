import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { ContentTable, CategoriesTable } from "@/db/schema";

console.log("🚀 Fixing NEWS category mapping (FINAL PRODUCTION)...");

// ---------- CATEGORY DETECTION LOGIC ----------

function detectCategory(title = "", content = "") {
  const t = (title + " " + content).toLowerCase();

  if (t.includes("funding") || t.includes("investment") || t.includes("raised"))
    return "Funding & Investment";

  if (t.includes("policy") || t.includes("government") || t.includes("scheme"))
    return "Policy & Government Schemes";

  if (t.includes("trend") || t.includes("industry"))
    return "Industry Trends";

  if (t.includes("launch") || t.includes("launched"))
    return "Launches";

  if (t.includes("partnership") || t.includes("collaboration"))
    return "Partnerships";

  if (t.includes("award") || t.includes("recognition"))
    return "Awards & Recognition";

  if (t.includes("tech") || t.includes("ai") || t.includes("startup tech"))
    return "Tech News";

  return "General News";
}

// ---------- BUILD CATEGORY MAP ----------

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "NEWS"));

  const map = new Map(rows.map(r => [r.name.toLowerCase(), r.id]));

  console.log(`📊 Found ${rows.length} NEWS categories`);
  return map;
}

// ---------- MAIN FIX FUNCTION ----------

async function fixNewsCategories() {
  const categoryMap = await buildCategoryMap();

  const news = await db
    .select({
      id: ContentTable.id,
      title: ContentTable.title,
      content: ContentTable.content,
      categoryId: ContentTable.categoryId,
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "NEWS"));

  console.log(`📰 Found ${news.length} NEWS items`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of news) {
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
    .where(eq(ContentTable.contentType, "NEWS"));

  console.log("Total:", stats.total);
  console.log("With category:", stats.withCategory);
  console.log("Without category:", stats.total - stats.withCategory);

  console.log("✅ NEWS CATEGORY FIX DONE");
}

fixNewsCategories();