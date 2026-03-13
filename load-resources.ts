import "dotenv/config";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { ResourcesTable } from "@/db/schema";

// ─── Load file ────────────────────────────────────────────────────────────────

async function loadResourcesFromFile(filePath: string) {
  // For .ts files, import directly since tsx can handle it
  if (filePath.endsWith(".ts")) {
    const module = await import(filePath);
    const resourcesData = module.gettingStartedData;
    // Flatten the data: assuming structure like { "India": [resources] }
    const resources = [];
    for (const [location, items] of Object.entries(resourcesData)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          // normalize id to integer if possible
          const normalizedId = typeof item.id === 'number' ? item.id : parseInt(item.id, 10) || null;
          resources.push({
            ...item,
            id: normalizedId,
            title: item.title ?? "",
            description: item.description ?? "",
            locationKey: String(location).toLowerCase(),
            locationLabel: String(location),
            scope: "INDIA_STATE", // always INDIA_STATE per request
          });
        }
      }
    }

    console.log(`💬 Loaded ${resources.length} resource items from ${filePath}`);
    return resources;
  } else {
    // For JSON files, parse normally
    const absolute = path.resolve(process.cwd(), filePath);
    const raw = readFileSync(absolute, "utf-8");
    const resourcesData = JSON.parse(raw);
    // Similar flattening
    const resources = [];
    for (const [location, items] of Object.entries(resourcesData)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          resources.push({
            ...item,
            locationKey: location.toLowerCase(),
            locationLabel: location,
            scope: location === "INDIA_STATE",
          });
        }
      }
    }
    console.log(`💬 Loaded ${resources.length} resource items from ${filePath}`);
    return resources;
  }
}

// ─── Insert resources ─────────────────────────────────────────────────────────

async function insertResources(resourceItems: any[]) {
  console.log(`\n📥 Inserting ${resourceItems.length} resource items…`);

  // Check for existing sourceIds to skip duplicates
  const existing: any[] = await db
    .select({ sourceId: ResourcesTable.sourceId })
    .from(ResourcesTable)
    .where(eq(ResourcesTable.scope, "INDIA_STATE")); // Assuming scope is INDIA_STATE for India

  const existingSourceIds = new Set(existing.map((r) => r.sourceId).filter(Boolean));
  console.log(`📊 ${existingSourceIds.size} resource items already in database — will skip duplicates\n`);

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
        console.log(`  … ${stats.inserted} inserted`);
      }
    } catch (err: any) {
      console.error(`  ❌ Failed resource ${item.id} "${item.title?.substring(0, 40)}": ${err.message}`);
      console.error("     full item:", JSON.stringify(item));
      console.error(err.stack);
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
      active: sql`count(case when is_active = true then 1 end)`.mapWith(Number),
    })
    .from(ResourcesTable);

  console.log("\n📊 RESULTS");
  console.log("=".repeat(50));
  console.log(`💬 Resource items in DB : ${counts.total}`);
  console.log(`✅ Active               : ${counts.active}`);
  console.log(`⚠️  Inactive            : ${counts.total - counts.active}`);
  console.log("=".repeat(50));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log("🚀 Starting resources migration…");
  console.log("=".repeat(50));

  const filePath = process.argv[2] || "./src/data/gettingstarted.ts";
  console.log(`📂 File: ${filePath}\n`);

  const rawResources = await loadResourcesFromFile(filePath);
  const stats = await insertResources(rawResources);

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
