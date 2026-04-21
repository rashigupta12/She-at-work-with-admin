// app/api/admin/contact-submissions/bulk-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ContactSubmissionsTable } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No IDs provided" },
        { status: 400 }
      );
    }

    // Optional: Add validation for admin permissions here
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const result = await db
      .delete(ContactSubmissionsTable)
      .where(inArray(ContactSubmissionsTable.id, ids))
      .returning({ id: ContactSubmissionsTable.id });

    return NextResponse.json({
      success: true,
      deletedCount: result.length,
      deletedIds: result.map(r => r.id),
    });
  } catch (err) {
    console.error("[DELETE /admin/contact-submissions/bulk-delete]", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete messages" },
      { status: 500 }
    );
  }
}