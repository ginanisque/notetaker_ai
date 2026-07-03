import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import DuplicateMeetings from "@/components/DuplicateMeetings";
import MeetingSummary from "@/components/MeetingSummary";
import { requireUser } from "@/lib/auth";
import { findDuplicateMeetings, getMeetingById } from "@/lib/meetings";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const meeting = await getMeetingById(id);

  if (!meeting) {
    notFound();
  }

  const duplicateCandidates = meeting.mergedFrom?.length ? [] : await findDuplicateMeetings(meeting);

  return (
    <AppShell
      eyebrow={meeting.workspaceName ?? "Meeting"}
      title={meeting.title}
      description={formatDate(meeting.date)}
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
      <div className="mx-auto max-w-5xl">
        <section className="mt-8">
          <DuplicateMeetings meeting={meeting} candidates={duplicateCandidates} />
          <MeetingSummary meeting={meeting} />
        </section>
      </div>
    </AppShell>
  );
}
