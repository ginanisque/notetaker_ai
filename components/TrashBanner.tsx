"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusMessage from "@/components/StatusMessage";

function daysRemaining(deletedAt: string) {
  const purgeTime = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeTime - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function TrashBanner({ meetingId, deletedAt }: { meetingId: string; deletedAt: string }) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [error, setError] = useState("");

  async function handleRestore() {
    setError("");
    setIsRestoring(true);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/restore`, { method: "POST" });
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

  async function handlePurge() {
    if (!window.confirm("Permanently delete this meeting now? This cannot be undone.")) {
      return;
    }

    setError("");
    setIsPurging(true);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/purge`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Unable to permanently delete meeting.");
      }

      router.push("/meetings/trash");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to permanently delete meeting.");
      setIsPurging(false);
    }
  }

  return (
    <div className="mb-8 space-y-2">
      <StatusMessage tone="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>In trash — {daysRemaining(deletedAt)} days until permanent deletion.</span>
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRestore()}
              disabled={isRestoring || isPurging}
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-red-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Restore
            </button>
            <button
              type="button"
              onClick={() => void handlePurge()}
              disabled={isRestoring || isPurging}
              className="inline-flex items-center gap-2 rounded-md border border-white/60 px-3 py-1.5 text-sm font-semibold text-red-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {isPurging ? "Deleting..." : "Delete permanently"}
            </button>
          </span>
        </div>
      </StatusMessage>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  );
}
