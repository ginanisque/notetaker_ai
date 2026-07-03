import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createWorkspace, getWorkspaces } from "@/lib/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    return NextResponse.json(await getWorkspaces());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load workspaces.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { name?: string };

    try {
      body = (await request.json()) as { name?: string };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
    }

    return NextResponse.json(await createWorkspace(name), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create workspace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
