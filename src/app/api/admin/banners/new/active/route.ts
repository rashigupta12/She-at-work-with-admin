// app/api/banners/active/route.ts
import { db } from "@/db";
import { BannersTable } from "@/db/schema";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ── Cache config ─────────────────────────────────────────────────────────────
// Active banners change infrequently — cache for 60s at the CDN/ISR layer.
export const revalidate = 60;

// ── Type for query params ─────────────────────────────────────────────────────
type ScreenType = typeof BannersTable.$inferSelect["screenType"];

// ─── GET /api/banners/active ──────────────────────────────────────────────────
// Query: ?screenType=DESKTOP&page=/home&position=top
// Always returns { success: true, data: [] } so frontend .map() never breaks.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const screenType = searchParams.get("screenType") as ScreenType | null;
    const page       = searchParams.get("page");
    const position   = searchParams.get("position");

    const now = new Date();

    // ── Build conditions ──────────────────────────────────────────────────────
    // Order matters for Postgres query planner:
    // 1. Equality checks first  (status, screenType, page, position) — uses indexes
    // 2. Range/null checks last (startsAt, endsAt)
    const conditions = [
      eq(BannersTable.status, "ACTIVE"),

      // Optional equality filters — narrow the result set early
      ...(screenType ? [eq(BannersTable.screenType, screenType)] : []),
      ...(page       ? [eq(BannersTable.page, page)]             : []),
      ...(position   ? [eq(BannersTable.position, position)]     : []),

      // Scheduling window: startsAt IS NULL OR startsAt <= now
      or(isNull(BannersTable.startsAt), lte(BannersTable.startsAt, now))!,

      // Scheduling window: endsAt IS NULL OR endsAt >= now
      or(isNull(BannersTable.endsAt), gte(BannersTable.endsAt, now))!,
    ];

    // ── Query — only select what the frontend actually needs ──────────────────
    // Dropped: createdBy JOIN (unnecessary on public route — saves a JOIN round-trip)
    const banners = await db
      .select({
        id:                 BannersTable.id,
        name:               BannersTable.name,
        slug:               BannersTable.slug,
        screenType:         BannersTable.screenType,
        page:               BannersTable.page,
        position:           BannersTable.position,
        width:              BannersTable.width,
        height:             BannersTable.height,
        backgroundColor:    BannersTable.backgroundColor,
        backgroundImageUrl: BannersTable.backgroundImageUrl,
        backgroundImageAlt: BannersTable.backgroundImageAlt,
        backgroundSize:     BannersTable.backgroundSize,
        backgroundPosition: BannersTable.backgroundPosition,
        elements:           BannersTable.elements,
        priority:           BannersTable.priority,
        startsAt:           BannersTable.startsAt,
        endsAt:             BannersTable.endsAt,
      })
      .from(BannersTable)
      .where(and(...conditions))
      .orderBy(desc(BannersTable.priority)); // highest priority first

    // ── _id alias for frontend compatibility ──────────────────────────────────
    const data = banners.map((b) => ({ ...b, _id: b.id }));

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          // CDN-level cache: serve for 60s, allow background revalidation for 30s
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );

  } catch (err) {
    console.error("[GET /api/banners/active]", err);

    // Always return data:[] so frontend .map() never throws
    return NextResponse.json(
      { success: false, message: "Error fetching banners", data: [] },
      { status: 500 }
    );
  }
}