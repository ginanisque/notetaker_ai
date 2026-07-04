"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusMessage from "@/components/StatusMessage";

export default function GoogleConnectionPanel({ isConnected }: { isConnected: boolean }) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState("");

  async function handleDisconnect() {
    setError("");
    setIsDisconnecting(true);

    try {
      const response = await fetch("/api/calendar/disconnect", { method: "POST" });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Unable to disconnect Google Calendar.");
      }

      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to disconnect Google Calendar.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <div className="surface space-y-4 rounded-md p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          {isConnected ? "Connected" : "Not connected"}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Google Calendar</h2>
      </div>

      {isConnected ? (
        <button
          type="button"
          onClick={() => void handleDisconnect()}
          disabled={isDisconnecting}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 font-semibold text-ink shadow-sm transition hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Disconnect Google Calendar
        </button>
      ) : (
        <a
          href="/api/google/auth"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55]"
        >
          Connect Google Calendar
        </a>
      )}

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  );
}
