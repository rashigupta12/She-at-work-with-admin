// app/api/admin/me/route.ts
import { auth } from "@/auth";
import { db } from "@/db";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.email, session.user.email),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Return in the format expected by the frontend
    return NextResponse.json({
      _id: user.id,
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}