"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import StatusMessage from "@/components/StatusMessage";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { MeetingComment } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function CommentsPanel({ meetingId, comments }: { meetingId: string; comments: MeetingComment[] }) {
  const [rows, setRows] = useState(comments);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function refreshComments() {
    const response = await fetch(`/api/comments?meetingId=${meetingId}`, { cache: "no-store" });
    if (!response.ok) return;
    setRows((await response.json()) as MeetingComment[]);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`comments-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `meeting_id=eq.${meetingId}` },
        () => {
          void refreshComments();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!body.trim()) return;

    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, body: body.trim() })
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error || "Unable to add comment.");
      return;
    }
    setBody("");
    await refreshComments();
  }

  async function deleteComment(id: string) {
    const response = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Unable to delete comment.");
      return;
    }
    setRows((current) => current.filter((comment) => comment.id !== id));
  }

  return (
    <section className="space-y-4">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
        <MessageSquare className="h-5 w-5 text-accent" aria-hidden />
        Comments
      </h2>
      <form onSubmit={addComment} className="surface space-y-3 rounded-md p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a follow-up comment"
          rows={3}
          className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white">
          Add comment
        </button>
      </form>
      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((comment) => (
            <div key={comment.id} className="rounded-md border border-line bg-white/90 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{comment.authorName || comment.authorEmail || "User"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{formatDate(comment.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteComment(comment.id)}
                  aria-label="Delete comment"
                  className="text-neutral-400 transition hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-700">{comment.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-600">No comments yet.</p>
      )}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </section>
  );
}
