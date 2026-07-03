"use client";

import { GitMerge } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusMessage from "@/components/StatusMessage";
import type { DuplicateMeetingCandidate, MeetingRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function DuplicateMeetings({
  meeting,
  candidates
}: {
  meeting: MeetingRecord;
  candidates: DuplicateMeetingCandidate[];
}) {
  const router = useRouter();
  const [isMerging, setIsMerging] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (candidates.length === 0) {
    return null;
  }

  async function mergeWith(candidateId: string) {
    setError("");
    setIsMerging(candidateId);

    try {
      const response = await fetch("/api/meetings/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryMeetingId: meeting.id,
          duplicateMeetingId: candidateId
        })
      });
      const body = (await response.json()) as MeetingRecord | { error?: string };

      if (!response.ok || "error" in body) {
        throw new Error(("error" in body && body.error) || "Unable to merge meetings.");
      }

      const mergedMeeting = body as MeetingRecord;
      router.push(`/meetings/${mergedMeeting.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to merge meetings.");
    } finally {
      setIsMerging(null);
    }
  }

  return (
    <section className="mb-8 rounded-md border border-gold/30 bg-[#fff7e8] p-5">
      <div className="flex items-start gap-3">
        <GitMerge className="mt-1 h-5 w-5 text-gold" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-ink">Possible duplicate recording</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-700">
            Another meeting with a similar title was saved around the same time. Merge if these notes came from the
            same meeting.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="flex flex-col gap-3 rounded-md border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-ink">{candidate.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{formatDate(candidate.date)}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{candidate.shortSummary}</p>
            </div>
            <button
              type="button"
              onClick={() => void mergeWith(candidate.id)}
              disabled={Boolean(isMerging)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GitMerge className="h-4 w-4" aria-hidden />
              {isMerging === candidate.id ? "Merging..." : "Merge notes"}
            </button>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-4">
          <StatusMessage tone="error">{error}</StatusMessage>
        </div>
      ) : null}
    </section>
  );
}
