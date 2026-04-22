import { db } from "@/db";
import { BannersTable } from "@/db/schema";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ── Cache config ─────────────────────────────────────────────────────────────
// Active banners change infrequently — cache for 60s at the CDN/ISR layer.
export const revalidate = 60;

type ScreenType = typeof BannersTable.$inferSelect["screenType"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const screenType = searchParams.get("screenType") as ScreenType | null;
    const page       = searchParams.get("page");
    const position   = searchParams.get("position");

    const now = new Date();

    const conditions = [
      eq(BannersTable.status, "ACTIVE"),

      ...(screenType ? [eq(BannersTable.screenType, screenType)] : []),
      ...(page ? [eq(BannersTable.page, page)] : []),
      ...(position ? [eq(BannersTable.position, position)] : []),

      or(isNull(BannersTable.startsAt), lte(BannersTable.startsAt, now))!,

      or(isNull(BannersTable.endsAt), gte(BannersTable.endsAt, now))!,
    ];

    const banners = await db
      .select({
        id: BannersTable.id,
        name: BannersTable.name,
        slug: BannersTable.slug,
        screenType: BannersTable.screenType,
        page: BannersTable.page,
        position: BannersTable.position,
        width: BannersTable.width,
        height: BannersTable.height,
        backgroundColor: BannersTable.backgroundColor,
        backgroundImageUrl: BannersTable.backgroundImageUrl,
        backgroundImageAlt: BannersTable.backgroundImageAlt,
        backgroundSize: BannersTable.backgroundSize,
        backgroundPosition: BannersTable.backgroundPosition,
        elements: BannersTable.elements,
        priority: BannersTable.priority,
        startsAt: BannersTable.startsAt,
        endsAt: BannersTable.endsAt,
      })
      .from(BannersTable)
      .where(and(...conditions))
      .orderBy(desc(BannersTable.priority)); 

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
    return NextResponse.json(
      { success: false, message: "Error fetching banners", data: [] },
      { status: 500 }
    );
  }
}