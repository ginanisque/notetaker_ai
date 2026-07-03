import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import MeetingSummary from "@/components/MeetingSummary";
import { requireUser } from "@/lib/auth";
import { getMeetingById } from "@/lib/meetings";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const meeting = await getMeetingById(id);

  if (!meeting) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Meetings
          </Link>
          <LogoutButton />
        </div>
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-medium text-neutral-600">{formatDate(meeting.date)}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{meeting.title}</h1>
          {meeting.workspaceName ? <p className="mt-3 text-sm text-neutral-600">{meeting.workspaceName}</p> : null}
        </header>
        <section className="mt-8">
          <MeetingSummary meeting={meeting} />
        </section>
      </div>
    </main>
  );
}
