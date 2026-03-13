import "dotenv/config";
import { db } from "@/db";
import { eq, isNull, sql } from "drizzle-orm";
import { ContentTable, CategoriesTable } from "@/db/schema";

const FALLBACK_CATEGORY = "Tech News";

async function getFallbackId() {
  const [row] = await db
    .select({ id: CategoriesTable.id })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.name, FALLBACK_CATEGORY));

  if (!row) {
    console.error("❌ Tech News category not found");
    process.exit(1);
  }

  return row.id;
}

async function fix() {
  const fallbackId = await getFallbackId();

  const rows = await db
    .select({ id: ContentTable.id })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "NEWS"))
    .where(isNull(ContentTable.categoryId));

  console.log("Remaining:", rows.length);

  let updated = 0;

  for (const r of rows) {
    await db
      .update(ContentTable)
      .set({ categoryId: fallbackId })
      .where(eq(ContentTable.id, r.id));

    updated++;
  }

  console.log("Force Updated:", updated);
}

async function verify() {
  const [res] = await db
    .select({
      total: sql`count(*)`.mapWith(Number),
      withCategory: sql`count(case when category_id is not null then 1 end)`.mapWith(Number),
    })
    .from(ContentTable)
    .where(eq(ContentTable.contentType, "NEWS"));

  console.log("Total:", res.total);
  console.log("With category:", res.withCategory);
  console.log("Without category:", res.total - res.withCategory);
}

async function main() {
  await fix();
  await verify();
  console.log("✅ FINAL CATEGORY FIX DONE");
}

main();