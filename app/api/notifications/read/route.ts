import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    await markNotificationsRead();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
