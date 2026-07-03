"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusMessage from "@/components/StatusMessage";

export default function DeleteMeetingButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm("Move this meeting to trash? It will be kept for 30 days before permanent deletion.")) {
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Unable to delete meeting.");
      }

      router.push("/meetings");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete meeting.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={isDeleting}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Move to trash
      </button>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  );
}
