import Link from "next/link";
import type { MeetingRecord } from "@/lib/types";
import { formatDate, summarizeForCard } from "@/lib/utils";

export default function MeetingCard({ meeting }: { meeting: MeetingRecord }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="block rounded-md border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-lg font-semibold text-ink">{meeting.title}</h2>
        <time className="text-sm text-neutral-600">{formatDate(meeting.date)}</time>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-700">{summarizeForCard(meeting.summary)}</p>
    </Link>
  );
}
