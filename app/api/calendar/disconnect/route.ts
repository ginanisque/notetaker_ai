import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { disconnectGoogleCalendar } from "@/lib/google-calendar";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    await disconnectGoogleCalendar(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to disconnect Google Calendar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
