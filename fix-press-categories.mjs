import "dotenv/config";
import { db } from "./src/db/index.js";
import { eq } from "drizzle-orm";
import { ContentTable, CategoriesTable } from "./src/db/schema.js";

const CATEGORY_MAPPING = {
  "award": "Media Coverage",
  "recognition": "Media Coverage",
};

function detectCategory(title = "", content = "") {
  const text = (title + " " + content).toLowerCase();

  for (const keyword in CATEGORY_MAPPING) {
    if (text.includes(keyword)) {
      return CATEGORY_MAPPING[keyword];
    }
  }

  return null;
}

async function buildCategoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "PRESS"));

  return new Map(rows.map(r => [r.name, r.id]));
}

async function fix() {
  console.log("Fixing remaining press categories...");

  const categoryMap = await buildCategoryMap();

  const pressItems = await db
    .select({
      id: ContentTable.id,
      title: ContentTable.title,
      content: ContentTable.content,
      categoryId: ContentTable.categoryId,
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "PRESS"));

  let updated = 0;

  for (const item of pressItems) {
    if (item.categoryId) continue;

    const categoryName = detectCategory(item.title, item.content);
    if (!categoryName) continue;

    const categoryId = categoryMap.get(categoryName);
    if (!categoryId) continue;

    await db
      .update(ContentTable)
      .set({ categoryId })
      .where(eq(ContentTable.id, item.id));

    updated++;
  }

  console.log("Updated:", updated);
}

fix().then(() => process.exit());