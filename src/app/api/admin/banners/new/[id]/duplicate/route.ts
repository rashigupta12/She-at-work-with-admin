// app/api/admin/banners/new/[id]/duplicate/route.ts
import { db } from "@/db";
import { dbPool } from "@/db/index-pool";
import { BannersTable, UsersTable } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const body = await req.json();
    const { name, slug, createdBy } = body;
    
    if (!createdBy) {
      return NextResponse.json(
        { success: false, message: "Created by user ID is required." },
        { status: 400 }
      );
    }
    
    // Get source banner
    const sourceBanner = await db.query.BannersTable.findFirst({
      where: eq(BannersTable.id, id),
    });
    
    if (!sourceBanner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }
    
    const newSlug = slug || `${sourceBanner.slug}-copy-${Date.now()}`;
    const newName = name || `${sourceBanner.name} (Copy)`;
    
    // Check for duplicate
    const existing = await db.query.BannersTable.findFirst({
      where: and(
        eq(BannersTable.slug, newSlug),
        eq(BannersTable.screenType, sourceBanner.screenType)
      ),
    });
    
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A banner with this slug and screen type already exists." },
        { status: 409 }
      );
    }
    
    // Create duplicate
    const [duplicateBanner] = await dbPool
      .insert(BannersTable)
      .values({
        name: newName,
        slug: newSlug,
        description: sourceBanner.description,
        screenType: sourceBanner.screenType,
        page: sourceBanner.page,
        position: sourceBanner.position,
        width: sourceBanner.width,
        height: sourceBanner.height,
        backgroundColor: sourceBanner.backgroundColor,
        backgroundImageUrl: sourceBanner.backgroundImageUrl,
        backgroundImageAlt: sourceBanner.backgroundImageAlt,
        backgroundSize: sourceBanner.backgroundSize,
        backgroundPosition: sourceBanner.backgroundPosition,
        elements: sourceBanner.elements,
        status: "DRAFT",
        startsAt: null,
        endsAt: null,
        priority: sourceBanner.priority,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();
    
    // Fetch duplicate with user info
    const bannerWithUsers = await db
      .select({
        id: BannersTable.id,
        name: BannersTable.name,
        slug: BannersTable.slug,
        description: BannersTable.description,
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
        status: BannersTable.status,
        startsAt: BannersTable.startsAt,
        endsAt: BannersTable.endsAt,
        priority: BannersTable.priority,
        createdAt: BannersTable.createdAt,
        updatedAt: BannersTable.updatedAt,
        createdBy: sql`json_build_object('_id', ${UsersTable.id}, 'name', ${UsersTable.name}, 'email', ${UsersTable.email})`,
        updatedBy: sql`json_build_object('_id', ${UsersTable.id}, 'name', ${UsersTable.name}, 'email', ${UsersTable.email})`,
      })
      .from(BannersTable)
      .leftJoin(UsersTable, eq(BannersTable.createdBy, UsersTable.id))
      .where(eq(BannersTable.id, duplicateBanner.id))
      .limit(1);
    
    console.log("✅ Banner duplicated:", duplicateBanner.id);
    
    return NextResponse.json({
      success: true,
      message: "Banner duplicated successfully",
      data: {
        ...bannerWithUsers[0],
        _id: bannerWithUsers[0].id,
      },
    }, { status: 201 });
    
  } catch (err: any) {
    console.error("[POST /admin/banners/new/:id/duplicate]", err);
    
    if (err?.code === "23505") {
      return NextResponse.json(
        { success: false, message: "A banner with this slug and screen type already exists." },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Failed to duplicate banner", error: err.message },
      { status: 500 }
    );
  }
}