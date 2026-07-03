import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  endMeetingSession,
  getActiveMeetingSession,
  startMeetingSession
} from "@/lib/meeting-sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }

    const activeSession = await getActiveMeetingSession(workspaceId);

    return NextResponse.json({
      activeSession,
      canRecord: !activeSession || activeSession.hostId === user.id,
      canTakeOver: Boolean(activeSession && activeSession.hostId !== user.id)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load meeting session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { workspaceId?: string; title?: string; takeOver?: boolean };

    try {
      body = (await request.json()) as { workspaceId?: string; title?: string; takeOver?: boolean };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (!body.workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }

    return NextResponse.json(await startMeetingSession(body.workspaceId, body.title, Boolean(body.takeOver)), {
      status: 201
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start meeting session.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { sessionId?: string };

    try {
      body = (await request.json()) as { sessionId?: string };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    return NextResponse.json(await endMeetingSession(body.sessionId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to end meeting session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
