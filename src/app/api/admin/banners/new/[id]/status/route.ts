// app/api/admin/banners/new/[id]/status/route.ts
import { db } from "@/db";
import { dbPool } from "@/db/index-pool";
import { BannersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const body = await req.json();
    const { status, updatedBy } = body;
    
    if (!status) {
      return NextResponse.json(
        { success: false, message: "Status is required" },
        { status: 400 }
      );
    }
    
    if (!updatedBy) {
      return NextResponse.json(
        { success: false, message: "Updated by user ID is required." },
        { status: 400 }
      );
    }
    
    const validStatuses = ["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status value" },
        { status: 400 }
      );
    }
    
    const [updatedBanner] = await dbPool
      .update(BannersTable)
      .set({
        status: status as any,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(BannersTable.id, id))
      .returning({ id: BannersTable.id, name: BannersTable.name, status: BannersTable.status });
    
    if (!updatedBanner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Banner status updated to ${status}`,
      data: updatedBanner,
    });
  } catch (err) {
    console.error("[PATCH /admin/banners/new/:id/status]", err);
    return NextResponse.json(
      { success: false, message: "Error updating banner status" },
      { status: 500 }
    );
  }
}