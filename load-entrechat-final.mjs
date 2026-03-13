import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import path from "path";
import { ContentTable, CategoriesTable, TagsTable, ContentTagsTable } from "@/db/schema";

function detectCategory(content, title) {
  const c = (content + " " + title).toLowerCase();

  if (c.includes("design") || c.includes("architecture") || c.includes("interior")) return "Design & Architecture";
  if (c.includes("wellness") || c.includes("health") || c.includes("yoga")) return "Wellness & Health";
  if (c.includes("funding") || c.includes("finance") || c.includes("investment")) return "Funding & Finance";
  if (c.includes("tech") || c.includes("software") || c.includes("ai") || c.includes("digital")) return "Technology";
  if (c.includes("leadership") || c.includes("ceo") || c.includes("management")) return "Leadership";
  if (c.includes("marketing") || c.includes("branding") || c.includes("advertising")) return "Marketing";
  if (c.includes("product") || c.includes("innovation") || c.includes("development")) return "Product Development";
  if (c.includes("balance") || c.includes("family") || c.includes("work life")) return "Work-Life Balance";
  if (c.includes("legal") || c.includes("compliance") || c.includes("law")) return "Legal & Compliance";

  return "Entrepreneurship";
}

function readingTime(text) {
  return Math.max(1, Math.ceil((text?.split(/\s+/).length || 0) / 200));
}

function excerpt(content) {
  return content?.replace(/<[^>]*>/g, "").substring(0, 200) || "";
}

function slug(post) {
  const base = post.post_name || post.post_title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-");

  return `${base}-${String(post.ID).slice(-6)}`;
}

async function load(filePath) {
  const raw = readFileSync(path.resolve(filePath), "utf-8");

  let cleaned = raw
    .replace(/\[\/?ffb_param.*?\]/g, "")
    .replace(/\\r\\n/g, " ")
    .replace(/\\\//g, "/")
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/export\s+const\s+\w+\s*=\s*/, "")
    .replace(/export\s+default\s+/, "")
    .trim();

  if (cleaned.endsWith(";")) cleaned = cleaned.slice(0, -1);

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return new Function(`return ${cleaned}`)();
    } catch (e) {
      console.error("❌ ENTRECHAT FILE PARSE FAILED");
      console.log("First 500 chars ↓");
      console.log(cleaned.slice(0, 500));
      throw e;
    }
  }
}

async function categoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "ENTRECHAT"));

  return new Map(rows.map(r => [r.name.toLowerCase(), r.id]));
}

async function getTag(tx, name) {
  const slug = name.toLowerCase().replace(/\s+/g, "-");

  const exist = await tx
    .select({ id: TagsTable.id })
    .from(TagsTable)
    .where(eq(TagsTable.name, name))
    .limit(1);

  if (exist.length) return exist[0].id;

  const [row] = await tx.insert(TagsTable)
    .values({ name, slug, usageCount: 1, createdAt: new Date() })
    .returning({ id: TagsTable.id });

  return row.id;
}

async function migrate(items, map) {
  let inserted = 0, updated = 0;

  for (const item of items) {
    const catName = detectCategory(item.post_content, item.post_title);
    const catId = map.get(catName.toLowerCase()) ?? map.get("entrepreneurship");

    await db.transaction(async tx => {
      const existing = await tx
        .select({ id: ContentTable.id })
        .from(ContentTable)
        .where(eq(ContentTable.wpId, item.ID))
        .limit(1);

      const data = {
        title: item.post_title,
        slug: slug(item),
        summary: excerpt(item.post_content),
        content: item.post_content,
        contentType: "ENTRECHAT",
        categoryId: catId,
        featuredImage: item.featured_image_url,
        readingTime: readingTime(item.post_content),
        status: "PUBLISHED",
        publishedAt: new Date(item.post_date),
        updatedAt: new Date()
      };

      let contentId;

      if (existing.length) {
        await tx.update(ContentTable).set(data)
          .where(eq(ContentTable.id, existing[0].id));

        contentId = existing[0].id;
        updated++;
      } else {
        const [row] = await tx.insert(ContentTable)
          .values({ wpId: item.ID, ...data, createdAt: new Date(item.post_date) })
          .returning({ id: ContentTable.id });

        contentId = row.id;
        inserted++;
      }

      const tagId = await getTag(tx, "entrechat");

      await tx.insert(ContentTagsTable)
        .values({ contentId, tagId, createdAt: new Date() })
        .onConflictDoNothing();
    });
  }

  console.log("Inserted:", inserted);
  console.log("Updated:", updated);
}

async function verify() {
  const [res] = await db.select({
    total: sql`count(*)`.mapWith(Number),
    withCategory: sql`count(case when category_id is not null then 1 end)`.mapWith(Number)
  }).from(ContentTable)
    .where(eq(ContentTable.contentType, "ENTRECHAT"));

  console.log("Total:", res.total);
  console.log("With category:", res.withCategory);
}

async function main() {
  const file = process.argv[2] || "./src/data/Entrechat.ts";
  const items = await load(file);
  const map = await categoryMap();

  await migrate(items, map);
  await verify();

  console.log("✅ ENTRECHAT MIGRATION DONE");
}

main();