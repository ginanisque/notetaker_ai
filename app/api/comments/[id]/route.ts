import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteComment } from "@/lib/comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const { id } = await params;
    await deleteComment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete comment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
