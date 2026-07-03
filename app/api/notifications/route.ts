import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCommentCount, getUnreadComments } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const [comments, count] = await Promise.all([getUnreadComments(), getUnreadCommentCount()]);

    return NextResponse.json({ comments, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
