// app/api/admin/banners/new/update-scheduled/route.ts
import { db } from "@/db";
import { dbPool } from "@/db/index-pool";
import { BannersTable } from "@/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { updatedBy } = body;
    
    if (!updatedBy) {
      return NextResponse.json(
        { success: false, message: "Updated by user ID is required." },
        { status: 400 }
      );
    }
    
    const now = new Date();
    
    // Activate scheduled banners
    const activated = await dbPool
      .update(BannersTable)
      .set({
        status: "ACTIVE",
        updatedBy,
        updatedAt: now,
      })
      .where(
        and(
          eq(BannersTable.status, "SCHEDULED"),
          lte(BannersTable.startsAt, now)
        )
      )
      .returning({ id: BannersTable.id });
    
    // Deactivate expired banners
    const deactivated = await dbPool
      .update(BannersTable)
      .set({
        status: "INACTIVE",
        updatedBy,
        updatedAt: now,
      })
      .where(
        and(
          eq(BannersTable.status, "ACTIVE"),
          lte(BannersTable.endsAt, now)
        )
      )
      .returning({ id: BannersTable.id });
    
    console.log("✅ Scheduled update:", {
      activated: activated.length,
      deactivated: deactivated.length,
    });
    
    return NextResponse.json({
      success: true,
      message: "Scheduled banners updated",
      data: {
        activated: activated.length,
        deactivated: deactivated.length,
      },
    });
  } catch (err) {
    console.error("[POST /admin/banners/new/update-scheduled]", err);
    return NextResponse.json(
      { success: false, message: "Error updating scheduled banners" },
      { status: 500 }
    );
  }
}