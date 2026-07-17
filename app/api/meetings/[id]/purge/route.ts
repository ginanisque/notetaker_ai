import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { purgeMeetingNow } from "@/lib/meetings";
import { removeMeetingAudio } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { id } = await params;
    const { purged, audioUrl } = await purgeMeetingNow(id);

    if (!purged) {
      return NextResponse.json(
        { error: "Meeting not found, not in trash, or you are not the owner." },
        { status: 403 }
      );
    }

    if (audioUrl) {
      await removeMeetingAudio(audioUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to permanently delete meeting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
