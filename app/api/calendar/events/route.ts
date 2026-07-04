import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchUpcomingEvents, getValidAccessToken } from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const accessToken = await getValidAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ connected: false, events: [] });
    }

    const events = await fetchUpcomingEvents(accessToken);
    return NextResponse.json({ connected: true, events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load calendar events.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
