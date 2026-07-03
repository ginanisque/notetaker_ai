import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import CommentsPanel from "@/components/CommentsPanel";
import DeleteMeetingButton from "@/components/DeleteMeetingButton";
import DuplicateMeetings from "@/components/DuplicateMeetings";
import MeetingAudioPlayer from "@/components/MeetingAudioPlayer";
import MeetingSummary from "@/components/MeetingSummary";
import TagsPanel from "@/components/TagsPanel";
import TrashBanner from "@/components/TrashBanner";
import { requireUser } from "@/lib/auth";
import { findDuplicateMeetings, getMeetingById } from "@/lib/meetings";
import { getSignedAudioUrl } from "@/lib/storage";
import { getWorkspaceMembers } from "@/lib/workspace-invites";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const meeting = await getMeetingById(id);

  if (!meeting) {
    notFound();
  }

  const isTrashed = Boolean(meeting.deletedAt);
  const isOwner = meeting.ownerId === user.id;
  const duplicateCandidates =
    meeting.mergedFrom?.length || isTrashed ? [] : await findDuplicateMeetings(meeting);
  const members = meeting.workspaceId ? await getWorkspaceMembers(meeting.workspaceId) : [];
  const signedAudioUrl = meeting.audioUrl ? await getSignedAudioUrl(meeting.audioUrl) : null;

  return (
    <AppShell
      eyebrow={meeting.workspaceName ?? "Meeting"}
      title={meeting.title}
      description={formatDate(meeting.date)}
      actions={
        <>
          <Link
            href="/meetings"
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Meetings
          </Link>
          {isOwner && !isTrashed ? <DeleteMeetingButton meetingId={meeting.id} /> : null}
        </>
      }
    >
      <div className="mx-auto max-w-5xl">
        <section className="mt-8">
          {isTrashed && meeting.deletedAt ? <TrashBanner meetingId={meeting.id} deletedAt={meeting.deletedAt} /> : null}
          <DuplicateMeetings meeting={meeting} candidates={duplicateCandidates} />
          {signedAudioUrl ? <MeetingAudioPlayer audioUrl={signedAudioUrl} /> : null}
          <div className="mb-8">
            <TagsPanel meetingId={meeting.id} workspaceId={meeting.workspaceId} tags={meeting.tags ?? []} />
          </div>
          <MeetingSummary meeting={meeting} members={members} />
          <div className="mt-8">
            <CommentsPanel meetingId={meeting.id} comments={meeting.comments ?? []} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
