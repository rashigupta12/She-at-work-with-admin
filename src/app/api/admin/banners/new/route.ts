// app/api/admin/banners/new/route.ts
import { db } from "@/db";
import { dbPool } from "@/db/index-pool";
import { BannersTable, UsersTable } from "@/db/schema";
import { and, count, desc, asc, eq, ilike, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── GET /api/admin/banners/new ──────────────────────────────────────────────
// Query: ?page=1&limit=20&status=ACTIVE&screenType=DESKTOP&search=keyword&active=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const offset = (page - 1) * limit;
    
    const status = searchParams.get("status") as typeof BannersTable.$inferSelect["status"] | null;
    const screenType = searchParams.get("screenType") as typeof BannersTable.$inferSelect["screenType"] | null;
    const slug = searchParams.get("slug");
    const pageRoute = searchParams.get("pageRoute");
    const search = searchParams.get("search")?.trim() ?? "";
    const active = searchParams.get("active") === "true";
    const sortBy = searchParams.get("sortBy") ?? "priority";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    // Build WHERE conditions
    const conditions = [];
    
    if (status) conditions.push(eq(BannersTable.status, status));
    if (screenType) conditions.push(eq(BannersTable.screenType, screenType));
    if (slug) conditions.push(eq(BannersTable.slug, slug));
    if (pageRoute) conditions.push(eq(BannersTable.page, pageRoute));
    
    if (search) {
      conditions.push(
        or(
          ilike(BannersTable.name, `%${search}%`),
          ilike(BannersTable.description, `%${search}%`)
        )
      );
    }
    
    if (active) {
      const now = new Date();
      conditions.push(
        eq(BannersTable.status, "ACTIVE"),
        sql`(${BannersTable.startsAt} IS NULL OR ${BannersTable.startsAt} <= ${now})`,
        sql`(${BannersTable.endsAt} IS NULL OR ${BannersTable.endsAt} >= ${now})`
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Build ORDER BY - Fixed: use asc() function directly
    const orderByClause = (() => {
      if (sortOrder === "desc") {
        switch (sortBy) {
          case "priority": return desc(BannersTable.priority);
          case "createdAt": return desc(BannersTable.createdAt);
          case "updatedAt": return desc(BannersTable.updatedAt);
          case "name": return desc(BannersTable.name);
          default: return desc(BannersTable.priority);
        }
      } else {
        switch (sortBy) {
          case "priority": return asc(BannersTable.priority);
          case "createdAt": return asc(BannersTable.createdAt);
          case "updatedAt": return asc(BannersTable.updatedAt);
          case "name": return asc(BannersTable.name);
          default: return asc(BannersTable.priority);
        }
      }
    })();
    
    // Run count + data in parallel
    const [rows, [{ total }]] = await Promise.all([
      db
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
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),
        
      db
        .select({ total: count() })
        .from(BannersTable)
        .where(whereClause),
    ]);
    
    // Format the response to match the frontend expected structure
    const formattedRows = rows.map(row => ({
      ...row,
      _id: row.id,
      createdBy: row.createdBy || null,
      updatedBy: row.updatedBy || null,
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedRows,
      meta: {
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    console.error("[GET /admin/banners/new]", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/banners/new ─────────────────────────────────────────────
// FormData: name, slug, screenType, page, width, height, createdBy, etc.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Extract fields
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const screenType = formData.get("screenType") as string;
    const page = formData.get("page") as string;
    const position = formData.get("position") as string;
    const width = formData.get("width") as string;
    const height = formData.get("height") as string;
    const backgroundColor = formData.get("backgroundColor") as string;
    const backgroundImageUrl = formData.get("backgroundImageUrl") as string;
    const backgroundImageAlt = formData.get("backgroundImageAlt") as string;
    const backgroundSize = formData.get("backgroundSize") as string;
    const backgroundPosition = formData.get("backgroundPosition") as string;
    const elements = formData.get("elements") as string;
    const status = formData.get("status") as string;
    const startsAt = formData.get("startsAt") as string;
    const endsAt = formData.get("endsAt") as string;
    const priority = formData.get("priority") as string;
    const createdBy = formData.get("createdBy") as string;
    
    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Banner name is required." },
        { status: 400 }
      );
    }
    if (!screenType) {
      return NextResponse.json(
        { success: false, message: "Screen type is required." },
        { status: 400 }
      );
    }
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page is required." },
        { status: 400 }
      );
    }
    if (!width || !height) {
      return NextResponse.json(
        { success: false, message: "Width and height are required." },
        { status: 400 }
      );
    }
    if (!createdBy) {
      return NextResponse.json(
        { success: false, message: "Created by user ID is required." },
        { status: 400 }
      );
    }
    
    const finalSlug = slug || generateSlug(name);
    
    // Check for existing banner
    const existingBanner = await db.query.BannersTable.findFirst({
      where: and(
        eq(BannersTable.slug, finalSlug),
        eq(BannersTable.screenType, screenType as any)
      ),
    });
    
    if (existingBanner) {
      return NextResponse.json(
        { success: false, message: "A banner with this slug and screen type already exists." },
        { status: 409 }
      );
    }
    
    // Parse elements
    let parsedElements = [];
    if (elements) {
      parsedElements = JSON.parse(elements);
    }
    
    // Create banner
    const [newBanner] = await dbPool
      .insert(BannersTable)
      .values({
        name: name.trim(),
        slug: finalSlug,
        description: description || null,
        screenType: screenType as any,
        page: page.trim(),
        position: position || "top",
        width: parseInt(width),
        height: parseInt(height),
        backgroundColor: backgroundColor || "#ffffff",
        backgroundImageUrl: backgroundImageUrl || null,
        backgroundImageAlt: backgroundImageAlt || null,
        backgroundSize: backgroundSize || "cover",
        backgroundPosition: backgroundPosition || "center",
        elements: parsedElements,
        status: (status as any) || "DRAFT",
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        priority: priority ? parseInt(priority) : 0,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();
    
    // Fetch created banner with user info
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
      .where(eq(BannersTable.id, newBanner.id))
      .limit(1);
    
    console.log("✅ Banner created:", newBanner.id);
    
    return NextResponse.json({
      success: true,
      message: "Banner created successfully.",
      data: {
        ...bannerWithUsers[0],
        _id: bannerWithUsers[0].id,
      },
    }, { status: 201 });
    
  } catch (err: any) {
    console.error("[POST /admin/banners/new]", err);
    
    if (err?.code === "23505") {
      return NextResponse.json(
        { success: false, message: "A banner with this slug and screen type already exists." },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Failed to create banner", error: err.message },
      { status: 500 }
    );
  }
}