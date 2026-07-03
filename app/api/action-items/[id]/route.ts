import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateActionItem } from "@/lib/action-items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { status?: string; deadline?: string; assignedUserId?: string | null };

    try {
      body = (await request.json()) as { status?: string; deadline?: string; assignedUserId?: string | null };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (body.status && body.status !== "open" && body.status !== "in_progress" && body.status !== "done") {
      return NextResponse.json({ error: "Status must be open, in_progress, or done." }, { status: 400 });
    }

    const { id } = await params;
    return NextResponse.json(
      await updateActionItem(id, {
        status: body.status as "open" | "in_progress" | "done" | undefined,
        deadline: body.deadline,
        assignedUserId: body.assignedUserId
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update action item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
