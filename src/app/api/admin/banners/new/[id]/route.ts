// app/api/admin/banners/new/[id]/route.ts
import { db } from "@/db";
import { dbPool } from "@/db/index-pool";
import { BannersTable, UsersTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/admin/banners/new/[id] ─────────────────────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const banner = await db
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
      .where(eq(BannersTable.id, id))
      .limit(1);
    
    if (!banner[0]) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...banner[0],
        _id: banner[0].id,
      },
    });
  } catch (err) {
    console.error("[GET /admin/banners/new/:id]", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banner" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/banners/new/[id] ───────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
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
    const updatedBy = formData.get("updatedBy") as string;
    
    if (!updatedBy) {
      return NextResponse.json(
        { success: false, message: "Updated by user ID is required." },
        { status: 400 }
      );
    }
    
    // Check if banner exists
    const existingBanner = await db.query.BannersTable.findFirst({
      where: eq(BannersTable.id, id),
    });
    
    if (!existingBanner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }
    
    // Build update data
    const updateData: any = {
      updatedBy,
      updatedAt: new Date(),
    };
    
    if (name !== undefined && name !== null) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (screenType !== undefined) updateData.screenType = screenType;
    if (page !== undefined) updateData.page = page.trim();
    if (position !== undefined) updateData.position = position;
    if (width !== undefined && width !== null) updateData.width = parseInt(width);
    if (height !== undefined && height !== null) updateData.height = parseInt(height);
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (backgroundImageUrl !== undefined) updateData.backgroundImageUrl = backgroundImageUrl || null;
    if (backgroundImageAlt !== undefined) updateData.backgroundImageAlt = backgroundImageAlt || null;
    if (backgroundSize !== undefined) updateData.backgroundSize = backgroundSize;
    if (backgroundPosition !== undefined) updateData.backgroundPosition = backgroundPosition;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined && priority !== null) updateData.priority = parseInt(priority);
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;
    
    if (elements !== undefined && elements !== null) {
      updateData.elements = JSON.parse(elements);
    }
    
    // Check slug uniqueness if changing
    if (slug && slug !== existingBanner.slug) {
      const slugScreenType = screenType || existingBanner.screenType;
      const duplicate = await db.query.BannersTable.findFirst({
        where: and(
          eq(BannersTable.slug, slug),
          eq(BannersTable.screenType, slugScreenType as any),
          eq(BannersTable.id, id)
        ),
      });
      
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "A banner with this slug and screen type already exists." },
          { status: 409 }
        );
      }
      updateData.slug = slug;
    }
    
    // Update banner
    await dbPool
      .update(BannersTable)
      .set(updateData)
      .where(eq(BannersTable.id, id));
    
    // Fetch updated banner with user info
    const updatedBanner = await db
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
      .where(eq(BannersTable.id, id))
      .limit(1);
    
    console.log("✅ Banner updated:", id);
    
    return NextResponse.json({
      success: true,
      message: "Banner updated successfully.",
      data: {
        ...updatedBanner[0],
        _id: updatedBanner[0].id,
      },
    });
    
  } catch (err: any) {
    console.error("[PATCH /admin/banners/new/:id]", err);
    
    if (err?.code === "23505") {
      return NextResponse.json(
        { success: false, message: "A banner with this slug and screen type already exists." },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Failed to update banner", error: err.message },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/admin/banners/new/[id] ──────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const [deleted] = await dbPool
      .delete(BannersTable)
      .where(eq(BannersTable.id, id))
      .returning({ id: BannersTable.id, name: BannersTable.name });
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }
    
    console.log("✅ Banner deleted:", id);
    
    return NextResponse.json({
      success: true,
      message: `Banner "${deleted.name}" deleted successfully`,
      data: { id: deleted.id },
    });
  } catch (err) {
    console.error("[DELETE /admin/banners/new/:id]", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete banner" },
      { status: 500 }
    );
  }
}