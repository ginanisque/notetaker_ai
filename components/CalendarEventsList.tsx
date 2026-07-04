"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, NotebookPen } from "lucide-react";
import StatusMessage from "@/components/StatusMessage";
import type { CleanedCalendarEvent } from "@/lib/meeting-platform";
import { formatDate } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

export default function CalendarEventsList() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<CleanedCalendarEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [preparingEventId, setPreparingEventId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      try {
        const response = await fetch("/api/calendar/events", { cache: "no-store" });
        const body = (await response.json()) as {
          connected?: boolean;
          events?: CleanedCalendarEvent[];
          error?: string;
        };

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(body.error || "Unable to load calendar events.");
        }

        setIsConnected(Boolean(body.connected));
        setEvents(body.events ?? []);
        setState("ready");
      } catch (reason) {
        if (!isMounted) return;
        setErrorMessage(reason instanceof Error ? reason.message : "Unable to load calendar events.");
        setState("error");
      }
    }

    void loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handlePrepareNotes(eventId: string) {
    setErrorMessage("");
    setPreparingEventId(eventId);

    try {
      const response = await fetch("/api/calendar/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId })
      });
      const prepared = (await response.json()) as CleanedCalendarEvent & { error?: string };

      if (!response.ok) {
        throw new Error(prepared.error || "Unable to prepare notes for this event.");
      }

      const params = new URLSearchParams();
      params.set("calendarEventId", prepared.externalEventId);
      if (prepared.title) params.set("title", prepared.title);
      if (prepared.meetingUrl) params.set("meetingUrl", prepared.meetingUrl);
      if (prepared.platform) params.set("platform", prepared.platform);
      if (prepared.startTime) params.set("scheduledStart", prepared.startTime);
      if (prepared.endTime) params.set("scheduledEnd", prepared.endTime);
      if (prepared.attendees.length) params.set("attendees", JSON.stringify(prepared.attendees));

      router.push(`/record?${params.toString()}`);
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Unable to prepare notes for this event.");
      setPreparingEventId(null);
    }
  }

  if (state === "loading") {
    return <StatusMessage>Loading your upcoming meetings...</StatusMessage>;
  }

  if (state === "error") {
    return <StatusMessage tone="error">{errorMessage}</StatusMessage>;
  }

  if (!isConnected) {
    return (
      <div className="rounded-md border border-dashed border-line bg-white/85 p-8 text-center">
        <p className="text-neutral-700">Connect Google Calendar to see upcoming meetings.</p>
        <Link
          href="/integrations"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55]"
        >
          Go to Integrations
        </Link>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line bg-white/85 p-8 text-center text-neutral-700">
        No upcoming meetings found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage ? <StatusMessage tone="error">{errorMessage}</StatusMessage> : null}
      {events.map((event) => (
        <div key={event.externalEventId} className="surface rounded-md p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{event.title}</p>
                {event.platform ? (
                  <span className="rounded-full border border-accent/30 bg-mist px-2 py-0.5 text-xs font-semibold text-accent">
                    {event.platform}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {event.startTime ? formatDate(event.startTime) : "No start time"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.meetingUrl ? (
                <a
                  href={event.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Open Meeting Link
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => void handlePrepareNotes(event.externalEventId)}
                disabled={preparingEventId === event.externalEventId}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <NotebookPen className="h-4 w-4" aria-hidden />
                Prepare Notes
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
