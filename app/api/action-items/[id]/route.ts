import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateActionItemStatus } from "@/lib/action-items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { status?: string };

    try {
      body = (await request.json()) as { status?: string };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (body.status !== "open" && body.status !== "done") {
      return NextResponse.json({ error: "Status must be open or done." }, { status: 400 });
    }

    const { id } = await params;
    return NextResponse.json(await updateActionItemStatus(id, body.status));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update action item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
