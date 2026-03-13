import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import path from "path";
import { ContentTable, CategoriesTable, TagsTable, ContentTagsTable } from "@/db/schema";

function getCategory(content, title) {
  const c = (content + " " + title).toLowerCase();

  if (c.includes("webinar") || c.includes("online") || c.includes("virtual")) return "Webinars";
  if (c.includes("conference") || c.includes("summit")) return "Conferences";
  if (c.includes("workshop") || c.includes("training") || c.includes("masterclass")) return "Workshops";
  if (c.includes("dialogue") || c.includes("forum") || c.includes("panel")) return "Forums";
  if (c.includes("network") || c.includes("meetup")) return "Networking";
  if (c.includes("seminar") || c.includes("lecture")) return "Seminars";
  if (c.includes("festival") || c.includes("celebration")) return "Festivals";
  if (c.includes("award") || c.includes("felicitation")) return "Awards";

  return "Other Events";
}

function readingTime(text) {
  if (!text) return 1;
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}

function excerpt(content) {
  if (!content) return "";
  const plain = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return plain.substring(0, 200);
}

function slug(post) {
  const base = post.post_name
    ? post.post_name
    : post.post_title.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "-");
  return `${base}-${String(post.ID).slice(-6)}`;
}

async function load(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, "utf-8");

  try {
    // try JSON first
    if (filePath.endsWith(".json")) {
      return JSON.parse(raw);
    }

    // try export const pattern
    let match = raw.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*?\])/m);

    // try export default
    if (!match) {
      match = raw.match(/export\s+default\s+(\[[\s\S]*?\])/m);
    }

    if (!match) {
      console.error("❌ Could not parse events file.");
      console.log("Preview:");
      console.log(raw.substring(0, 500));
      process.exit(1);
    }

    return new Function(`return ${match[1]}`)();
  } catch (err) {
    console.error("❌ Failed parsing events file:", err);
    process.exit(1);
  }
}

async function categoryMap() {
  const rows = await db
    .select({ id: CategoriesTable.id, name: CategoriesTable.name })
    .from(CategoriesTable)
    .where(eq(CategoriesTable.contentType, "EVENT"));

  return new Map(rows.map(r => [r.name.toLowerCase(), r.id]));
}

async function tag(tx, name) {
  const slug = name.toLowerCase().replace(/\s+/g, "-");

  const exist = await tx
    .select({ id: TagsTable.id })
    .from(TagsTable)
    .where(eq(TagsTable.name, name))
    .limit(1);

  if (exist.length) return exist[0].id;

  const [created] = await tx.insert(TagsTable)
    .values({ name, slug, usageCount: 1, createdAt: new Date() })
    .returning({ id: TagsTable.id });

  return created.id;
}

async function migrate(events, map) {
  let inserted = 0;
  let updated = 0;

  for (const item of events) {
    const catName = getCategory(item.post_content, item.post_title);
    const catId = map.get(catName.toLowerCase()) ?? map.get("other events");

    await db.transaction(async (tx) => {
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
        contentType: "EVENT",
        categoryId: catId,
        featuredImage: item.featured_image_url,
        readingTime: readingTime(item.post_content),
        status: "PUBLISHED",
        publishedAt: new Date(item.post_date),
        updatedAt: new Date(),
      };

      let contentId;

      if (existing.length > 0) {
        await tx
          .update(ContentTable)
          .set(data)
          .where(eq(ContentTable.id, existing[0].id));

        contentId = existing[0].id;
        updated++;
      } else {
        const [row] = await tx.insert(ContentTable)
          .values({
            wpId: item.ID,
            ...data,
            createdAt: new Date(item.post_date),
          })
          .returning({ id: ContentTable.id });

        contentId = row.id;
        inserted++;
      }

      const tagId = await tag(tx, "event");

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
    .where(eq(ContentTable.contentType, "EVENT"));

  console.log("Total:", res.total);
  console.log("With category:", res.withCategory);
}

async function main() {
  const file = process.argv[2] || "./src/data/events.ts";
  const events = await load(file);
  const map = await categoryMap();

  await migrate(events, map);
  await verify();

  console.log("✅ EVENTS MIGRATION DONE");
}

main();