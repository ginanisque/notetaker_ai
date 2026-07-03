import ActionItemsTable from "@/components/ActionItemsTable";
import CopyButton from "@/components/CopyButton";
import EmailButton from "@/components/EmailButton";
import type { MeetingRecord } from "@/lib/types";
import { notesToText } from "@/lib/utils";

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm leading-6 text-neutral-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="rounded-md border border-line bg-white px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-600">None captured.</p>
      )}
    </section>
  );
}

export default function MeetingSummary({ meeting }: { meeting: MeetingRecord }) {
  const notesText = notesToText(meeting.summary, meeting.transcript);
  const actionItems = meeting.actionItems?.length ? meeting.actionItems : meeting.summary.actionItems;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <CopyButton text={notesText} label="Copy notes" />
          <CopyButton text={meeting.summary.followUpEmail} label="Copy email" />
          <EmailButton subject={`Follow-up: ${meeting.title}`} body={meeting.summary.followUpEmail} />
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Short summary</h2>
          <p className="mt-3 leading-7 text-neutral-700">{meeting.summary.shortSummary}</p>
        </div>
      </section>

      <ListSection title="Key discussion points" items={meeting.summary.keyDiscussionPoints} />
      <ListSection title="Decisions made" items={meeting.summary.decisionsMade} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Action items</h2>
        <ActionItemsTable items={actionItems} />
      </section>

      <ListSection title="Unresolved questions" items={meeting.summary.unresolvedQuestions} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Follow-up email</h2>
        <pre className="whitespace-pre-wrap rounded-md border border-line bg-white p-5 text-sm leading-6 text-neutral-800">
          {meeting.summary.followUpEmail}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Full transcript</h2>
        <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-white p-5 text-sm leading-6 text-neutral-800">
          {meeting.transcript}
        </pre>
      </section>
    </div>
  );
}
