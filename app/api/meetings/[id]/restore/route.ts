import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { restoreMeeting } from "@/lib/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { id } = await params;
    const restored = await restoreMeeting(id);

    if (!restored) {
      return NextResponse.json(
        { error: "Meeting not found, not in trash, or you are not the owner." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to restore meeting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
