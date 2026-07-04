import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import Recorder from "@/components/Recorder";
import { requireUser } from "@/lib/auth";
import { getWorkspaces } from "@/lib/meetings";
import type { CalendarEventPrefill, MeetingAttendee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecordPage({
  searchParams
}: {
  searchParams: Promise<{
    workspaceId?: string;
    calendarEventId?: string;
    title?: string;
    meetingUrl?: string;
    platform?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    attendees?: string;
  }>;
}) {
  const user = await requireUser();
  const {
    workspaceId,
    calendarEventId,
    title,
    meetingUrl,
    platform,
    scheduledStart,
    scheduledEnd,
    attendees
  } = await searchParams;
  const workspaces = await getWorkspaces();

  let calendarEvent: CalendarEventPrefill | null = null;

  if (calendarEventId) {
    let parsedAttendees: MeetingAttendee[] = [];

    if (attendees) {
      try {
        parsedAttendees = JSON.parse(attendees) as MeetingAttendee[];
      } catch {
        parsedAttendees = [];
      }
    }

    calendarEvent = {
      calendarEventId,
      title: title ?? null,
      meetingUrl: meetingUrl ?? null,
      platform: platform ?? null,
      scheduledStart: scheduledStart ?? null,
      scheduledEnd: scheduledEnd ?? null,
      attendees: parsedAttendees
    };
  }

  return (
    <AppShell
      eyebrow="Recorder"
      title="Record meeting"
      description="Capture the discussion and turn it into structured meeting notes."
      actions={
        <Link href="/meetings" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-accent">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Meetings
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl">
        <section className="surface rounded-md p-5 sm:p-6">
          <Recorder
            workspaces={workspaces}
            initialWorkspaceId={workspaceId ?? ""}
            userId={user.id}
            calendarEvent={calendarEvent}
          />
        </section>
      </div>
    </AppShell>
  );
}
