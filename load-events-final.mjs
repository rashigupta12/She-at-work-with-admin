import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { ContentTable, CategoriesTable } from "@/db/schema";

console.log("🚀 Fixing EVENT category mapping (FINAL PRODUCTION)...");

// ---------- CATEGORY DETECTION ----------

function detectCategory(title = "", content = "") {
  const t = (title + " " + content).toLowerCase();

  if (t.includes("award") || t.includes("recognition"))
    return "Awards";

  if (t.includes("conference") || t.includes("summit"))
    return "Conferences";

  if (t.includes("festival") || t.includes("celebration"))
    return "Festivals";

  if (t.includes("forum") || t.includes("panel"))
    return "Forums";

  if (t.includes("network") || t.includes("meetup"))
    return "Networking";

  if (t.includes("seminar") || t.includes("training"))
    return "Seminars";

  if (t.includes("webinar") || t.includes("online session"))
    return "Webinars";

  if (t.includes("workshop") || t.includes("hands-on"))
    return "Workshops";

  return "Other Events";
}

// ---------- CATEGORY MAP ----------

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "EVENT"));

  const map = new Map(rows.map(r => [r.name.toLowerCase(), r.id]));

  console.log(`📊 Found ${rows.length} EVENT categories`);
  return map;
}

// ---------- MAIN FIX ----------

async function fixEventCategories() {
  const categoryMap = await buildCategoryMap();

  const events = await db
    .select({
      id: ContentTable.id,
      title: ContentTable.title,
      content: ContentTable.content,
      categoryId: ContentTable.categoryId,
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "EVENT"));

  console.log(`📅 Found ${events.length} EVENTS`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of events) {
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
    .where(eq(ContentTable.contentType, "EVENT"));

  console.log("Total:", stats.total);
  console.log("With category:", stats.withCategory);
  console.log("Without category:", stats.total - stats.withCategory);

  console.log("✅ EVENT CATEGORY FIX DONE");
}

fixEventCategories();