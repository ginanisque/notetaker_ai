import Link from "next/link";
import { CalendarDays, ChevronRight, Users } from "lucide-react";
import type { MeetingRecord } from "@/lib/types";
import { formatDate, summarizeForCard } from "@/lib/utils";

export default function MeetingCard({ meeting }: { meeting: MeetingRecord }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group block rounded-md border border-line bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{meeting.title}</h2>
          {meeting.workspaceName ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-mist px-2.5 py-1 text-xs font-semibold text-accent">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {meeting.workspaceName}
            </p>
          ) : null}
          {meeting.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meeting.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="rounded-md border border-line bg-white px-2 py-1 text-xs text-neutral-600">
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <time className="inline-flex items-center gap-1.5 text-sm text-neutral-600">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {formatDate(meeting.date)}
        </time>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-sm leading-6 text-neutral-700">{summarizeForCard(meeting.summary)}</p>
        <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-accent" />
      </div>
    </Link>
  );
}
