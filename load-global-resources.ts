import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { ResourcesTable } from "@/db/schema";

// ─── Load file ────────────────────────────────────────────────────────────────

async function loadGlobalResourcesFromFile(filePath: string) {
  // Import .ts file directly using dynamic import
  if (filePath.endsWith(".ts")) {
    const module = await import(filePath);
    const globalSchema = module.globalSchema;

    // Flatten the data: { "countries": [{ "country": "X", "data": [...] }, ...] }
    const resources = [];
    if (globalSchema.countries && Array.isArray(globalSchema.countries)) {
      for (const countryObj of globalSchema.countries) {
        const countryName = countryObj.country;
        const countryData = countryObj.data || [];

        if (Array.isArray(countryData)) {
          for (const item of countryData) {
            resources.push({
              ...item,
              locationKey: countryName.toLowerCase().replace(/\s+/g, "-"),
              locationLabel: countryName,
              scope: "GLOBAL", // Global resources
            });
          }
        }
      }
    }

    console.log(`💬 Loaded ${resources.length} global resource items from ${filePath}`);
    return resources;
  } else {
    throw new Error("Only .ts files are supported for globalschema");
  }
}

// ─── Insert resources ─────────────────────────────────────────────────────────

async function insertGlobalResources(resourceItems: any[]) {
  console.log(`\n📥 Inserting ${resourceItems.length} global resource items…`);

  // Check for existing sourceIds in GLOBAL scope
  const existing: any[] = await db
    .select({ sourceId: ResourcesTable.sourceId })
    .from(ResourcesTable)
    .where(eq(ResourcesTable.scope, "GLOBAL"));

  const existingSourceIds = new Set(existing.map((r) => r.sourceId).filter(Boolean));
  console.log(`📊 ${existingSourceIds.size} global resource items already in database — will skip duplicates\n`);

  const stats = { inserted: 0, skipped: 0, failed: 0 };

  for (const item of resourceItems) {
    if (item.id && existingSourceIds.has(item.id)) {
      stats.skipped++;
      continue;
    }

    try {
      await db.insert(ResourcesTable).values({
        scope: item.scope,
        locationKey: item.locationKey,
        locationLabel: item.locationLabel,
        title: item.title,
        description: item.description,
        link: item.link || null,
        sourceId: item.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      stats.inserted++;
      if (stats.inserted % 50 === 0) {
        console.log(`  … ${stats.inserted} inserted, ${stats.skipped} skipped, ${stats.failed} failed`);
      }
    } catch (err: any) {
      console.error(`  ❌ Failed resource ${item.id} "${item.title?.substring(0, 40)}": ${err.message}`);
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
      globalCount: sql`count(case when scope = 'GLOBAL' then 1 end)`.mapWith(Number),
      active: sql`count(case when is_active = true then 1 end)`.mapWith(Number),
    })
    .from(ResourcesTable);

  console.log("\n📊 RESULTS");
  console.log("=".repeat(50));
  console.log(`💬 Total resource items in DB : ${counts.total}`);
  console.log(`🌍 Global resources          : ${counts.globalCount}`);
  console.log(`✅ Active                     : ${counts.active}`);
  console.log("=".repeat(50));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log("🚀 Starting global resources migration…");
  console.log("=".repeat(50));

  const filePath = process.argv[2] || "./src/data/globalschema.ts";
  console.log(`📂 File: ${filePath}\n`);

  const rawResources = await loadGlobalResourcesFromFile(filePath);
  const stats = await insertGlobalResources(rawResources);

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
