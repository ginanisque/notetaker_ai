"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import StatusMessage from "@/components/StatusMessage";
import type { MeetingRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function daysRemaining(deletedAt: string) {
  const purgeTime = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeTime - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function TrashMeetingCard({ meeting }: { meeting: MeetingRecord }) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");

  async function handleRestore() {
    setError("");
    setIsRestoring(true);

    try {
      const response = await fetch(`/api/meetings/${meeting.id}/restore`, { method: "POST" });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Unable to restore meeting.");
      }

      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to restore meeting.");
      setIsRestoring(false);
    }
  }

  return (
    <div className="surface rounded-md p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={`/meetings/${meeting.id}`} className="font-semibold text-ink hover:text-accent">
            {meeting.title}
          </Link>
          <p className="mt-1 text-xs text-neutral-500">
            {formatDate(meeting.date)} ·{" "}
            {meeting.deletedAt ? `${daysRemaining(meeting.deletedAt)} days until permanent deletion` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={isRestoring}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Restore
        </button>
      </div>
      {error ? (
        <div className="mt-3">
          <StatusMessage tone="error">{error}</StatusMessage>
        </div>
      ) : null}
    </div>
  );
}
