"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { UnreadComment } from "@/lib/notifications";

export default function NotificationBell({
  initialCount,
  dropdownDirection = "up"
}: {
  initialCount: number;
  dropdownDirection?: "up" | "down";
}) {
  const [count, setCount] = useState(initialCount);
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<UnreadComment[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);

    if (!next) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.ok) {
        const body = (await response.json()) as { comments: UnreadComment[] };
        setComments(body.comments);
      }
      await fetch("/api/notifications/read", { method: "POST" });
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink transition hover:border-accent hover:text-accent"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={`absolute z-20 w-72 rounded-md border border-line bg-white p-2 shadow-lg ${
            dropdownDirection === "up" ? "bottom-12 left-0" : "right-0 top-12"
          }`}
        >
          {isLoading ? (
            <p className="p-3 text-sm text-neutral-500">Loading…</p>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <Link
                key={comment.id}
                href={`/meetings/${comment.meetingId}`}
                onClick={() => setIsOpen(false)}
                className="block rounded-md px-3 py-2 text-sm transition hover:bg-mist"
              >
                <p className="font-semibold text-ink">{comment.meetingTitle ?? "Meeting"}</p>
                <p className="mt-0.5 truncate text-neutral-600">{comment.body}</p>
              </Link>
            ))
          ) : (
            <p className="p-3 text-sm text-neutral-500">No new comments.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
