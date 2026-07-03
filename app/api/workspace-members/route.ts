import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addWorkspaceMemberByEmail, removeWorkspaceMember } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const body = (await request.json()) as { workspaceId?: string; email?: string };
    if (!body.workspaceId || !body.email) {
      return NextResponse.json({ error: "Workspace and email are required." }, { status: 400 });
    }

    return NextResponse.json(await addWorkspaceMemberByEmail(body.workspaceId, body.email), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add member.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const memberId = searchParams.get("memberId");
    if (!workspaceId || !memberId) {
      return NextResponse.json({ error: "Workspace and member are required." }, { status: 400 });
    }

    await removeWorkspaceMember(workspaceId, memberId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove member.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
