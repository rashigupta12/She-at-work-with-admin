// app/api/banners/active/route.ts
import { db } from "@/db";
import { BannersTable } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const screenType = searchParams.get("screenType");
    const page = searchParams.get("page");
    const position = searchParams.get("position");
    
    const now = new Date();
    
    const conditions = [
      eq(BannersTable.status, "ACTIVE"),
      sql`(${BannersTable.startsAt} IS NULL OR ${BannersTable.startsAt} <= ${now})`,
      sql`(${BannersTable.endsAt} IS NULL OR ${BannersTable.endsAt} >= ${now})`,
    ];
    
    if (screenType) conditions.push(eq(BannersTable.screenType, screenType as any));
    if (page) conditions.push(eq(BannersTable.page, page));
    if (position) conditions.push(eq(BannersTable.position, position));
    
    const banners = await db
      .select()
      .from(BannersTable)
      .where(and(...conditions))
      .orderBy(desc(BannersTable.priority));
    
    // Format to match frontend expected structure
    const formattedBanners = banners.map(banner => ({
      ...banner,
      _id: banner.id,
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedBanners,
    });
  } catch (err) {
    console.error("[GET /banners/active]", err);
    return NextResponse.json(
      { success: false, message: "Error fetching banners" },
      { status: 500 }
    );
  }
}