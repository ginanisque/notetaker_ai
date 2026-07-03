import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createWorkspaceInvite,
  getWorkspaceInvites,
  getWorkspaceMembers
} from "@/lib/workspace-invites";

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

    const [members, invites] = await Promise.all([getWorkspaceMembers(workspaceId), getWorkspaceInvites(workspaceId)]);
    return NextResponse.json({ members, invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load workspace members.";
    if (message.includes("workspace_invites")) {
      return NextResponse.json(
        { error: "Workspace invites are not installed yet. Run migration 004_workspace_invites.sql in Supabase." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { workspaceId?: string; email?: string; role?: "admin" | "member" };

    try {
      body = (await request.json()) as { workspaceId?: string; email?: string; role?: "admin" | "member" };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (!body.workspaceId || !body.email) {
      return NextResponse.json({ error: "Workspace and email are required." }, { status: 400 });
    }

    return NextResponse.json(await createWorkspaceInvite(body.workspaceId, body.email, body.role ?? "member"), {
      status: 201
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invite.";
    if (message.includes("workspace_invites")) {
      return NextResponse.json(
        { error: "Workspace invites are not installed yet. Run migration 004_workspace_invites.sql in Supabase." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
