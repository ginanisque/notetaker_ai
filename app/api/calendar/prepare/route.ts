import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchSingleEvent, getValidAccessToken } from "@/lib/google-calendar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { eventId?: string };

    try {
      body = (await request.json()) as { eventId?: string };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (!body.eventId) {
      return NextResponse.json({ error: "eventId is required." }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "Google Calendar is not connected." }, { status: 400 });
    }

    const event = await fetchSingleEvent(accessToken, body.eventId);
    return NextResponse.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare notes from this event.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
