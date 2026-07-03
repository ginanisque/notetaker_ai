import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import TrashMeetingCard from "@/components/TrashMeetingCard";
import { requireUser } from "@/lib/auth";
import { getTrashedMeetings } from "@/lib/meetings";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  await requireUser();
  const meetings = await getTrashedMeetings();

  return (
    <AppShell
      eyebrow="Meetings"
      title="Trash"
      description="Deleted meetings are kept for 30 days before being permanently removed."
      actions={
        <Link
          href="/meetings"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Meetings
        </Link>
      }
    >
      <div className="mx-auto mt-8 max-w-4xl space-y-4">
        {meetings.length > 0 ? (
          meetings.map((meeting) => <TrashMeetingCard key={meeting.id} meeting={meeting} />)
        ) : (
          <div className="rounded-md border border-dashed border-line bg-white/85 p-8 text-center">
            Trash is empty.
          </div>
        )}
      </div>
    </AppShell>
  );
}
